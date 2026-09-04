import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper';
import { useClients, useUpdateClientStatus } from './useClients';
import { mockClientProfiles } from '@/shared/mocks/fixtures';

const LOCAL = 'http://localhost:3001';

/** Monte la liste et la mutation sur le même client de cache. */
function renderListAndMutation() {
  const client = createTestQueryClient();
  const wrapper = createWrapper(client);

  return {
    list: renderHook(() => useClients(), { wrapper }),
    mutation: renderHook(() => useUpdateClientStatus(), { wrapper }),
  };
}

describe('useUpdateClientStatus', () => {
  it('modifie le profil d\'un client déjà qualifié', async () => {
    let envoye: Record<string, unknown> | undefined;

    server.use(
      http.patch(`${LOCAL}/clientProfiles/:id`, async ({ params, request }) => {
        envoye = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...envoye, id: Number(params.id) });
      }),
    );

    const { result } = renderHook(() => useUpdateClientStatus(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ clientId: 1, status: 'Inactive' });
    });

    await waitFor(() => expect(envoye).toBeDefined());

    expect(envoye).toMatchObject({ clientId: 1, status: 'Inactive' });
  });

  // Un client jamais qualifié n'a pas encore de profil : la mutation doit
  // le créer plutôt que d'échouer sur un enregistrement introuvable.
  it('crée le profil d\'un client jamais qualifié', async () => {
    let methode = '';
    let envoye: Record<string, unknown> | undefined;

    server.use(
      http.post(`${LOCAL}/clientProfiles`, async ({ request }) => {
        methode = 'POST';
        envoye = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...envoye, id: 99 }, { status: 201 });
      }),
    );

    const { result } = renderHook(() => useUpdateClientStatus(), {
      wrapper: createWrapper(),
    });

    // Le client 2 n'a pas de profil dans le jeu de données
    act(() => {
      result.current.mutate({ clientId: 2, status: 'Active' });
    });

    await waitFor(() => expect(envoye).toBeDefined());

    expect(methode).toBe('POST');
    expect(envoye).toMatchObject({ clientId: 2, status: 'Active' });
  });

  it('horodate la qualification', async () => {
    let envoye: Record<string, unknown> | undefined;

    server.use(
      http.patch(`${LOCAL}/clientProfiles/:id`, async ({ request }) => {
        envoye = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...envoye, id: 1 });
      }),
    );

    const { result } = renderHook(() => useUpdateClientStatus(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ clientId: 1, status: 'Churned' });
    });

    await waitFor(() => expect(envoye).toBeDefined());
    expect(new Date(String(envoye?.updatedAt)).getTime()).not.toBeNaN();
  });

  it('enregistre les notes accompagnant la qualification', async () => {
    let envoye: Record<string, unknown> | undefined;

    server.use(
      http.patch(`${LOCAL}/clientProfiles/:id`, async ({ request }) => {
        envoye = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...envoye, id: 1 });
      }),
    );

    const { result } = renderHook(() => useUpdateClientStatus(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        clientId: 1,
        status: 'Inactive',
        notes: 'Aucune commande depuis six mois',
      });
    });

    await waitFor(() => expect(envoye).toBeDefined());
    expect(envoye?.notes).toBe('Aucune commande depuis six mois');
  });

  // Les notes sont une saisie libre : elles sont assainies avant stockage,
  // et non seulement au moment de l'affichage.
  it('assainit les notes avant enregistrement', async () => {
    let envoye: Record<string, unknown> | undefined;

    server.use(
      http.patch(`${LOCAL}/clientProfiles/:id`, async ({ request }) => {
        envoye = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...envoye, id: 1 });
      }),
    );

    const { result } = renderHook(() => useUpdateClientStatus(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        clientId: 1,
        status: 'Active',
        notes: '<script>alert(1)</script>Relance effectuée',
      });
    });

    await waitFor(() => expect(envoye).toBeDefined());

    expect(String(envoye?.notes)).not.toContain('script');
    expect(String(envoye?.notes)).toContain('Relance effectuée');
  });

  it('accepte les quatre statuts de qualification', async () => {
    const envoyes: string[] = [];

    server.use(
      http.patch(`${LOCAL}/clientProfiles/:id`, async ({ request }) => {
        const corps = (await request.json()) as Record<string, unknown>;
        envoyes.push(String(corps.status));
        return HttpResponse.json({ ...corps, id: 1 });
      }),
    );

    const { result } = renderHook(() => useUpdateClientStatus(), {
      wrapper: createWrapper(),
    });

    for (const statut of ['Lead', 'Active', 'Inactive', 'Churned'] as const) {
      act(() => {
        result.current.mutate({ clientId: 1, status: statut });
      });
      await waitFor(() => expect(envoyes).toContain(statut));
    }

    expect(envoyes).toHaveLength(4);
  });

  // Le statut apparaît dans la liste comme dans la fiche : les deux caches
  // doivent être invalidés, sinon l'un des deux resterait périmé.
  it('rafraîchit la liste après qualification', async () => {
    server.use(
      http.patch(`${LOCAL}/clientProfiles/:id`, async ({ params, request }) => {
        const corps = (await request.json()) as Record<string, unknown>;
        const index = mockClientProfiles.findIndex(
          (profil) => profil.id === Number(params.id),
        );
        if (index !== -1) {
          mockClientProfiles[index] = {
            ...mockClientProfiles[index],
            ...corps,
          } as never;
        }
        return HttpResponse.json({ ...corps, id: Number(params.id) });
      }),
    );

    const { list, mutation } = renderListAndMutation();
    await waitFor(() => expect(list.result.current.data).toBeDefined());

    expect(list.result.current.data?.items.find((c) => c.id === 1)?.status).toBe('Active');

    act(() => {
      mutation.result.current.mutate({ clientId: 1, status: 'Churned' });
    });

    await waitFor(() => {
      expect(list.result.current.data?.items.find((c) => c.id === 1)?.status).toBe(
        'Churned',
      );
    });
  });

  it('signale un échec d\'enregistrement', async () => {
    server.use(
      http.patch(
        `${LOCAL}/clientProfiles/:id`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useUpdateClientStatus(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ clientId: 1, status: 'Churned' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('signale un échec de lecture du profil existant', async () => {
    server.use(
      http.get(`${LOCAL}/clientProfiles`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useUpdateClientStatus(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ clientId: 1, status: 'Active' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  // L'indicateur permet de désactiver le bouton pendant l'enregistrement,
  // pour éviter une double soumission.
  it('expose l\'état d\'avancement de la mutation', async () => {
    const { result } = renderHook(() => useUpdateClientStatus(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.mutate({ clientId: 1, status: 'Active' });
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});