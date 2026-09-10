import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/test/queryWrapper';
import {
  useCreateStockMovement,
  useLowStockAlerts,
  useStockMovements,
  useStockRotation,
} from './useStock';

const LOCAL = 'http://localhost:3001';

describe('useStockMovements', () => {
  it('charge l\'historique complet', async () => {
    const { result } = renderHook(() => useStockMovements(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(3);
  });

  // Le plus récent en premier : c'est l'ordre attendu d'un journal.
  it('trie du plus récent au plus ancien', async () => {
    const { result } = renderHook(() => useStockMovements(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    const dates = result.current.data?.map((m) => m.occurredAt) ?? [];
    const triees = [...dates].sort((a, b) => b.localeCompare(a));

    expect(dates).toEqual(triees);
  });

  it('restreint l\'historique à un produit', async () => {
    const { result } = renderHook(() => useStockMovements(101), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.every((m) => m.productId === 101)).toBe(true);
  });

  it('signale une erreur réseau', async () => {
    server.use(
      http.get(`${LOCAL}/stockMovements`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useStockMovements(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCreateStockMovement', () => {
  it('enregistre un mouvement saisi manuellement', async () => {
    let envoye: Record<string, unknown> | undefined;

    server.use(
      http.post(`${LOCAL}/stockMovements`, async ({ request }) => {
        envoye = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...envoye, id: 999 }, { status: 201 });
      }),
    );

    const { result } = renderHook(() => useCreateStockMovement(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        productId: 102,
        type: 'entree',
        quantity: 30,
        reason: 'Réception fournisseur',
      });
    });

    await waitFor(() => expect(envoye).toBeDefined());

    expect(envoye).toMatchObject({ productId: 102, type: 'entree', quantity: 30 });
    // La date est posée par le service, pas par l'appelant.
    expect(envoye?.occurredAt).toBeTruthy();
  });

  it('assainit le motif avant enregistrement', async () => {
    let envoye: Record<string, unknown> | undefined;

    server.use(
      http.post(`${LOCAL}/stockMovements`, async ({ request }) => {
        envoye = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...envoye, id: 999 }, { status: 201 });
      }),
    );

    const { result } = renderHook(() => useCreateStockMovement(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        productId: 102,
        type: 'ajustement',
        quantity: 2,
        reason: '<img src=x onerror="alert(1)">Casse',
      });
    });

    await waitFor(() => expect(envoye).toBeDefined());

    expect(envoye?.reason).not.toContain('onerror');
  });

  it('signale un échec d\'enregistrement', async () => {
    server.use(
      http.post(`${LOCAL}/stockMovements`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useCreateStockMovement(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        productId: 101,
        type: 'sortie',
        quantity: 1,
        reason: 'Test',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useLowStockAlerts', () => {
  it('détecte les produits sous leur seuil', async () => {
    const { result } = renderHook(() => useLowStockAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    // Mascara à 5 pour un seuil de 20, casque à 0
    expect(result.current.data).toHaveLength(2);
  });

  // Les ruptures bloquent la vente : elles passent devant quelle que soit
  // la quantité manquante.
  it('place les ruptures en tête', async () => {
    const { result } = renderHook(() => useLowStockAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.[0].severity).toBe('critique');
    expect(result.current.data?.[0].product.id).toBe(103);
  });

  it('compte les alertes critiques', async () => {
    const { result } = renderHook(() => useLowStockAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.criticalCount).toBe(1);
  });

  // Indicateur financier du tableau de bord : ce que coûterait le réassort.
  it('valorise le réassort nécessaire', async () => {
    const { result } = renderHook(() => useLowStockAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    // Mascara : 15 manquants à 90 €, casque : 10 manquants à 80 €
    expect(result.current.totalValue).toBe(2150);
  });

  it('propage une erreur de chargement du catalogue', async () => {
    server.use(
      http.get(
        'https://dummyjson.com/products',
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useLowStockAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useStockRotation', () => {
  it('calcule le taux de rotation du catalogue', async () => {
    const { result } = renderHook(() => useStockRotation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    // 15 unités sorties au total
    expect(result.current.data?.unitsOut).toBe(15);
  });

  it('classe les produits les plus mouvementés', async () => {
    const { result } = renderHook(() => useStockRotation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.topMoving[0].product.id).toBe(101);
    expect(result.current.topMoving[0].unitsOut).toBe(15);
  });

  it('restreint le calcul à un produit', async () => {
    const { result } = renderHook(() => useStockRotation(102), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    // Le produit 102 n'a qu'une entrée, aucune sortie
    expect(result.current.data?.unitsOut).toBe(0);
  });

  it('reste en chargement tant qu\'une des deux sources n\'a pas répondu', () => {
    const { result } = renderHook(() => useStockRotation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});