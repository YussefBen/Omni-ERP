import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper';
import {
  useAssignOpportunity,
  useCreateOpportunity,
  useDeleteOpportunity,
  useOpportunities,
  usePipelineStages,
  useUpdateOpportunity,
} from './useOpportunities';
import { getPipelineEvents } from '../services/pipelineEvents';
import type { PipelineEvent } from '../services/pipelineEvents';

const LOCAL = 'http://localhost:3001';

/** Rend deux hooks côte à côte pour observer la liste pendant qu'on la modifie. */
function renderListAndMutation<T>(useMutationHook: () => T) {
  const client = createTestQueryClient();
  const wrapper = createWrapper(client);

  const list = renderHook(() => useOpportunities(), { wrapper });
  const mutation = renderHook(useMutationHook, { wrapper });

  return { client, list, mutation };
}

describe('usePipelineStages', () => {
  it('charge les étapes triées par ordre d\'affichage', async () => {
    const { result } = renderHook(() => usePipelineStages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.map((stage) => stage.id)).toEqual([
      'prospection',
      'qualification',
      'proposition',
      'negociation',
      'gagnee',
      'perdue',
    ]);
  });
});

describe('useOpportunities', () => {
  it('charge toutes les opportunités', async () => {
    const { result } = renderHook(() => useOpportunities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(3);
  });

  it('filtre par étape du pipeline', async () => {
    const { result } = renderHook(() => useOpportunities('negociation'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].title).toBe('Refonte du portail');
  });

  it('signale une erreur réseau', async () => {
    server.use(
      http.get(`${LOCAL}/opportunities`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useOpportunities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useUpdateOpportunity', () => {
  it('applique le changement immédiatement, avant la réponse du serveur', async () => {
    // Réponse volontairement lente : on observe l'état pendant l'attente.
    server.use(
      http.patch(`${LOCAL}/opportunities/:id`, async ({ params, request }) => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...body, id: Number(params.id) });
      }),
    );

    const { list, mutation } = renderListAndMutation(useUpdateOpportunity);
    await waitFor(() => expect(list.result.current.data).toBeDefined());

    act(() => {
      mutation.result.current.mutate({ id: 1, stageId: 'gagnee' });
    });

    // L'étape a changé dans le cache sans attendre le serveur.
    await waitFor(() => {
      const item = list.result.current.data?.find((o) => o.id === 1);
      expect(item?.stageId).toBe('gagnee');
    });

    expect(mutation.result.current.isPending).toBe(true);
  });

  // Scénario décisif : sans restauration, la carte resterait dans la nouvelle
  // colonne alors que le serveur a refusé le déplacement. L'affichage
  // mentirait sur l'état réel des données.
  it('restaure l\'état d\'origine quand le serveur refuse', async () => {
    server.use(
      http.patch(
        `${LOCAL}/opportunities/:id`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const { list, mutation } = renderListAndMutation(useUpdateOpportunity);
    await waitFor(() => expect(list.result.current.data).toBeDefined());

    const avant = list.result.current.data?.find((o) => o.id === 1)?.stageId;
    expect(avant).toBe('negociation');

    act(() => {
      mutation.result.current.mutate({ id: 1, stageId: 'gagnee' });
    });

    await waitFor(() => expect(mutation.result.current.isError).toBe(true));

    await waitFor(() => {
      const item = list.result.current.data?.find((o) => o.id === 1);
      expect(item?.stageId).toBe('negociation');
    });
  });

  it('expose l\'erreur au composant appelant', async () => {
    server.use(
      http.patch(
        `${LOCAL}/opportunities/:id`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const { mutation } = renderListAndMutation(useUpdateOpportunity);

    act(() => {
      mutation.result.current.mutate({ id: 1, stageId: 'gagnee' });
    });

    await waitFor(() => expect(mutation.result.current.isError).toBe(true));
    expect(mutation.result.current.error).toBeInstanceOf(Error);
  });

  it('modifie un montant sans toucher à l\'étape', async () => {
    const { list, mutation } = renderListAndMutation(useUpdateOpportunity);
    await waitFor(() => expect(list.result.current.data).toBeDefined());

    act(() => {
      mutation.result.current.mutate({ id: 1, amount: 55000 });
    });

    await waitFor(() => {
      const item = list.result.current.data?.find((o) => o.id === 1);
      expect(item?.amount).toBe(55000);
      expect(item?.stageId).toBe('negociation');
    });
  });
});

describe('useCreateOpportunity', () => {
  it('affiche la nouvelle opportunité avant la réponse du serveur', async () => {
    server.use(
      http.post(`${LOCAL}/opportunities`, async ({ request }) => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...body, id: 999 }, { status: 201 });
      }),
    );

    const { list, mutation } = renderListAndMutation(useCreateOpportunity);
    await waitFor(() => expect(list.result.current.data).toHaveLength(3));

    act(() => {
      mutation.result.current.mutate({
        title: 'Nouvelle affaire',
        clientId: 1,
        stageId: 'prospection',
        amount: 10000,
        expectedCloseDate: '2026-12-31',
        owner: { id: 101, name: 'Camille Roussel' },
      });
    });

    await waitFor(() => expect(list.result.current.data).toHaveLength(4));

    const brouillon = list.result.current.data?.find(
      (o) => o.title === 'Nouvelle affaire',
    );
    // Identifiant temporaire négatif, remplacé par celui du serveur
    // lors de l'invalidation finale.
    expect(brouillon?.id).toBeLessThan(0);
  });

  it('retire l\'ébauche quand la création échoue', async () => {
    server.use(
      http.post(`${LOCAL}/opportunities`, () => new HttpResponse(null, { status: 500 })),
    );

    const { list, mutation } = renderListAndMutation(useCreateOpportunity);
    await waitFor(() => expect(list.result.current.data).toHaveLength(3));

    act(() => {
      mutation.result.current.mutate({
        title: 'Affaire refusée',
        clientId: 1,
        stageId: 'prospection',
        amount: 5000,
        expectedCloseDate: '2026-12-31',
        owner: { id: 101, name: 'Camille Roussel' },
      });
    });

    await waitFor(() => expect(mutation.result.current.isError).toBe(true));

    await waitFor(() => {
      expect(
        list.result.current.data?.some((o) => o.title === 'Affaire refusée'),
      ).toBe(false);
    });
  });
});

describe('useDeleteOpportunity', () => {
  it('retire l\'opportunité immédiatement', async () => {
    server.use(
      http.delete(`${LOCAL}/opportunities/:id`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return new HttpResponse(null, { status: 200 });
      }),
    );

    const { list, mutation } = renderListAndMutation(useDeleteOpportunity);
    await waitFor(() => expect(list.result.current.data).toHaveLength(3));

    act(() => {
      mutation.result.current.mutate(2);
    });

    await waitFor(() => {
      expect(list.result.current.data?.some((o) => o.id === 2)).toBe(false);
    });
  });

  // Une suppression annulée doit faire réapparaître la ligne : sinon
  // l'utilisateur croit avoir supprimé une donnée qui existe toujours.
  it('rétablit l\'opportunité quand la suppression échoue', async () => {
    server.use(
      http.delete(
        `${LOCAL}/opportunities/:id`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const { list, mutation } = renderListAndMutation(useDeleteOpportunity);
    await waitFor(() => expect(list.result.current.data).toHaveLength(3));

    act(() => {
      mutation.result.current.mutate(2);
    });

    await waitFor(() => expect(mutation.result.current.isError).toBe(true));

    await waitFor(() => {
      expect(list.result.current.data?.some((o) => o.id === 2)).toBe(true);
    });
  });
});

describe('useAssignOpportunity', () => {
  it('change le commercial responsable', async () => {
    const nouveau = { id: 104, name: 'Thomas Lefèvre' };

    const { list, mutation } = renderListAndMutation(useAssignOpportunity);
    await waitFor(() => expect(list.result.current.data).toBeDefined());

    act(() => {
      mutation.result.current.mutate({ id: 1, owner: nouveau });
    });

    await waitFor(() => {
      const item = list.result.current.data?.find((o) => o.id === 1);
      expect(item?.owner.name).toBe('Thomas Lefèvre');
    });
  });

  it('rétablit l\'ancien commercial en cas d\'échec', async () => {
    server.use(
      http.patch(
        `${LOCAL}/opportunities/:id`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const { list, mutation } = renderListAndMutation(useAssignOpportunity);
    await waitFor(() => expect(list.result.current.data).toBeDefined());

    act(() => {
      mutation.result.current.mutate({ id: 1, owner: { id: 104, name: 'Thomas' } });
    });

    await waitFor(() => expect(mutation.result.current.isError).toBe(true));

    await waitFor(() => {
      const item = list.result.current.data?.find((o) => o.id === 1);
      expect(item?.owner.name).toBe('Camille Roussel');
    });
  });
});

describe('publication des événements du pipeline', () => {
  let recus: PipelineEvent[];
  let unsubscribe: () => void;

  beforeEach(() => {
    recus = [];
    const subscription = getPipelineEvents().subscribe((event) => recus.push(event));
    unsubscribe = () => subscription.unsubscribe();
    return () => unsubscribe();
  });

  it('émet un événement après confirmation du changement d\'étape', async () => {
    const { mutation } = renderListAndMutation(useUpdateOpportunity);

    act(() => {
      mutation.result.current.mutate({ id: 1, stageId: 'gagnee' });
    });

    await waitFor(() => expect(recus).toHaveLength(1));

    expect(recus[0].type).toBe('stage-changed');
    expect(recus[0].opportunityId).toBe(1);
    expect(recus[0].toStage).toBe('gagnee');

    unsubscribe();
  });

  // L'événement ne doit pas être publié tant que le serveur n'a pas confirmé :
  // notifier un déplacement annulé induirait l'utilisateur en erreur.
  it('n\'émet aucun événement lorsque le serveur refuse', async () => {
    server.use(
      http.patch(
        `${LOCAL}/opportunities/:id`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const { mutation } = renderListAndMutation(useUpdateOpportunity);

    act(() => {
      mutation.result.current.mutate({ id: 1, stageId: 'gagnee' });
    });

    await waitFor(() => expect(mutation.result.current.isError).toBe(true));

    expect(recus).toHaveLength(0);
    unsubscribe();
  });

  it('n\'émet pas d\'événement d\'étape sur une simple modification de montant', async () => {
    const { mutation } = renderListAndMutation(useUpdateOpportunity);

    act(() => {
      mutation.result.current.mutate({ id: 1, amount: 42000 });
    });

    await waitFor(() => expect(mutation.result.current.isPending).toBe(false));

    expect(recus.filter((e) => e.type === 'stage-changed')).toHaveLength(0);
    unsubscribe();
  });
});