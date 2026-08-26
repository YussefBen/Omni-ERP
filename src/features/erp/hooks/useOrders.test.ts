import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper';
import {
  canChangeOrderStatus,
  getAllowedOrderTransitions,
  useOrder,
  useOrders,
  useUpdateOrderStatus,
} from './useOrders';
import { useStockMovements } from './useStock';

const LOCAL = 'http://localhost:3001';

/** Monte la liste des commandes et la mutation sur le même client. */
function renderOrdersAndMutation() {
  const client = createTestQueryClient();
  const wrapper = createWrapper(client);

  const list = renderHook(() => useOrders(), { wrapper });
  const mutation = renderHook(() => useUpdateOrderStatus(), { wrapper });
  const movements = renderHook(() => useStockMovements(), { wrapper });

  return { client, list, mutation, movements };
}

describe('getAllowedOrderTransitions', () => {
  it('propose l\'étape suivante et l\'annulation', () => {
    expect(getAllowedOrderTransitions('brouillon')).toEqual(['confirmee', 'annulee']);
    expect(getAllowedOrderTransitions('confirmee')).toEqual(['preparation', 'annulee']);
    expect(getAllowedOrderTransitions('preparation')).toEqual(['expediee', 'annulee']);
  });

  // Une commande expédiée est partie : elle ne peut plus être annulée,
  // seulement constatée livrée.
  it('n\'autorise plus l\'annulation après expédition', () => {
    expect(getAllowedOrderTransitions('expediee')).toEqual(['livree']);
  });

  it('ne propose plus rien depuis un statut terminal', () => {
    expect(getAllowedOrderTransitions('livree')).toEqual([]);
    expect(getAllowedOrderTransitions('annulee')).toEqual([]);
  });
});

describe('canChangeOrderStatus', () => {
  it('autorise la progression dans le flux', () => {
    expect(canChangeOrderStatus('confirmee', 'preparation')).toBe(true);
  });

  it('interdit le retour en arrière', () => {
    expect(canChangeOrderStatus('expediee', 'preparation')).toBe(false);
  });

  it('interdit de sauter une étape', () => {
    expect(canChangeOrderStatus('brouillon', 'expediee')).toBe(false);
  });

  it('interdit de rouvrir une commande livrée ou annulée', () => {
    expect(canChangeOrderStatus('livree', 'expediee')).toBe(false);
    expect(canChangeOrderStatus('annulee', 'confirmee')).toBe(false);
  });
});

describe('useOrders', () => {
  it('joint les lignes distantes aux statuts locaux', async () => {
    const { result } = renderHook(() => useOrders(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.items).toHaveLength(3);

    const premiere = result.current.data?.items.find((o) => o.id === 1);
    expect(premiere?.status).toBe('livree');
    expect(premiere?.lines).toHaveLength(1);
    expect(premiere?.discountedAmount).toBe(900);
  });

  // Les commandes les plus récentes en premier : c'est ce qu'attend
  // un écran de suivi.
  it('trie par date décroissante', async () => {
    const { result } = renderHook(() => useOrders(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const dates = result.current.data?.items.map((o) => o.placedAt) ?? [];
    const triees = [...dates].sort((a, b) => b.localeCompare(a));

    expect(dates).toEqual(triees);
  });

  // Le statut vient de la base locale : DummyJSON ne le connaît pas,
  // le filtre s'applique donc après jointure.
  it('filtre par statut après jointure', async () => {
    const { result } = renderHook(() => useOrders({ status: 'livree' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].status).toBe('livree');
  });

  it('filtre par client', async () => {
    const { result } = renderHook(() => useOrders({ clientId: 1 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.items.every((o) => o.clientId === 1)).toBe(true);
  });

  it('pagine les résultats', async () => {
    const { result } = renderHook(() => useOrders({ page: 1, pageSize: 2 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.total).toBe(3);
    expect(result.current.totalPages).toBe(2);
  });

  it('signale une erreur réseau', async () => {
    server.use(
      http.get('https://dummyjson.com/carts', () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useOrders(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useOrder', () => {
  it('n\'émet aucune requête sans identifiant', () => {
    const { result } = renderHook(() => useOrder(undefined), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
  });

  it('charge une commande avec son statut', async () => {
    const { result } = renderHook(() => useOrder(2), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.status).toBe('preparation');
    expect(result.current.data?.clientId).toBe(1);
  });
});

describe('useUpdateOrderStatus', () => {
  it('change le statut d\'une commande', async () => {
    const { list, mutation } = renderOrdersAndMutation();
    await waitFor(() => expect(list.result.current.data).toBeDefined());

    const commande = list.result.current.data?.items.find((o) => o.id === 2);

    act(() => {
      mutation.result.current.mutate({
        orderId: 2,
        status: 'expediee',
        order: commande,
      });
    });

    await waitFor(() => expect(mutation.result.current.isPending).toBe(false));
    expect(mutation.result.current.isError).toBe(false);
  });

  // Règle métier centrale de l'ERP : passer une commande en préparation
  // prélève les quantités commandées. Sans cela, les stocks et les commandes
  // vivraient chacun de leur côté et la rotation n'aurait aucun sens.
  it('génère les sorties de stock au passage en préparation', async () => {
    const envoyes: Array<Record<string, unknown>> = [];

    server.use(
      http.post(`${LOCAL}/stockMovements`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        envoyes.push(body);
        return HttpResponse.json({ ...body, id: 999 }, { status: 201 });
      }),
    );

    const { list, mutation } = renderOrdersAndMutation();
    await waitFor(() => expect(list.result.current.data).toBeDefined());

    const commande = list.result.current.data?.items.find((o) => o.id === 1);

    act(() => {
      mutation.result.current.mutate({
        orderId: 1,
        status: 'preparation',
        order: commande,
      });
    });

    await waitFor(() => expect(envoyes).toHaveLength(1));

    expect(envoyes[0]).toMatchObject({
      productId: 101,
      type: 'sortie',
      quantity: 2,
      orderId: 1,
    });
  });

  // L'annulation compense les sorties déjà passées : les quantités
  // réservées retournent en stock.
  it('génère les entrées compensatoires à l\'annulation', async () => {
    const envoyes: Array<Record<string, unknown>> = [];

    server.use(
      http.post(`${LOCAL}/stockMovements`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        envoyes.push(body);
        return HttpResponse.json({ ...body, id: 999 }, { status: 201 });
      }),
    );

    const { list, mutation } = renderOrdersAndMutation();
    await waitFor(() => expect(list.result.current.data).toBeDefined());

    const commande = list.result.current.data?.items.find((o) => o.id === 2);

    act(() => {
      mutation.result.current.mutate({
        orderId: 2,
        status: 'annulee',
        order: commande,
      });
    });

    await waitFor(() => expect(envoyes).toHaveLength(1));

    expect(envoyes[0]).toMatchObject({ type: 'entree', quantity: 2 });
  });

  // Les autres transitions ne touchent pas au stock : une expédition
  // ne prélève rien de plus, les quantités l'ont déjà été.
  it('ne génère aucun mouvement sur les autres transitions', async () => {
    const envoyes: Array<Record<string, unknown>> = [];

    server.use(
      http.post(`${LOCAL}/stockMovements`, async ({ request }) => {
        envoyes.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ id: 999 }, { status: 201 });
      }),
    );

    const { list, mutation } = renderOrdersAndMutation();
    await waitFor(() => expect(list.result.current.data).toBeDefined());

    const commande = list.result.current.data?.items.find((o) => o.id === 2);

    act(() => {
      mutation.result.current.mutate({
        orderId: 2,
        status: 'expediee',
        order: commande,
      });
    });

    await waitFor(() => expect(mutation.result.current.isPending).toBe(false));
    expect(envoyes).toHaveLength(0);
  });

  // Piège documenté dans le README : sans l'objet order, le statut change
  // mais les mouvements ne sont pas générés.
  it('ne génère aucun mouvement si la commande n\'est pas transmise', async () => {
    const envoyes: Array<Record<string, unknown>> = [];

    server.use(
      http.post(`${LOCAL}/stockMovements`, async ({ request }) => {
        envoyes.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ id: 999 }, { status: 201 });
      }),
    );

    const { mutation } = renderOrdersAndMutation();

    act(() => {
      mutation.result.current.mutate({ orderId: 1, status: 'preparation' });
    });

    await waitFor(() => expect(mutation.result.current.isPending).toBe(false));
    expect(envoyes).toHaveLength(0);
  });

  it('signale un échec de mise à jour', async () => {
    server.use(
      http.get(`${LOCAL}/orders`, () => new HttpResponse(null, { status: 500 })),
    );

    const { mutation } = renderOrdersAndMutation();

    act(() => {
      mutation.result.current.mutate({ orderId: 1, status: 'preparation' });
    });

    await waitFor(() => expect(mutation.result.current.isError).toBe(true));
  });
});