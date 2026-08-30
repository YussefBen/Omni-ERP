import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper';
import { useProjects } from './useProjects';
import { useCreateProject, useDeleteProject, useUpdateProject } from './useProjectMutations';
import type { Project } from '../types';

const LOCAL = 'http://localhost:3001';

function renderListAndMutation<T>(useMutationHook: () => T) {
  const client = createTestQueryClient();
  const wrapper = createWrapper(client);

  const list = renderHook(() => useProjects({ pageSize: 20 }), { wrapper });
  const mutation = renderHook(useMutationHook, { wrapper });

  return { client, list, mutation };
}

describe('useCreateProject', () => {
  it('crée un projet 100% local, au-delà des ids JSONPlaceholder', async () => {
    const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() });

    let created: Project | undefined;
    await act(async () => {
      created = await result.current.mutateAsync({
        title: 'Nouveau projet',
        description: 'Créé en test',
        ownerId: 1,
      });
    });

    expect(created).toMatchObject({ title: 'Nouveau projet', status: 'a_faire' });
    expect(created?.id).toBeGreaterThan(5);
  });
});

describe('useUpdateProject', () => {
  it('affiche le changement immédiatement (optimistic update)', async () => {
    const { list, mutation } = renderListAndMutation(useUpdateProject);
    await waitFor(() => expect(list.result.current.data?.items.length).toBeGreaterThan(0));

    server.use(
      http.patch(`${LOCAL}/projects/:id`, async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({ status: 'termine' });
      }),
    );

    act(() => {
      mutation.result.current.mutate({ id: 1, status: 'termine' });
    });

    await waitFor(() => {
      const item = list.result.current.data?.items.find((p) => p.id === 1);
      expect(item?.status).toBe('termine');
    });
  });

  it('annule le changement si le serveur refuse (rollback)', async () => {
    const { list, mutation } = renderListAndMutation(useUpdateProject);
    await waitFor(() => expect(list.result.current.data?.items.length).toBeGreaterThan(0));

    const statutInitial = list.result.current.data?.items.find((p) => p.id === 1)?.status;

    // Aucune surcharge n'existe encore pour ce projet : le service fait un POST, pas un PATCH
    server.use(
      http.post(`${LOCAL}/projects`, () => new HttpResponse(null, { status: 500 })),
    );

    act(() => {
      mutation.result.current.mutate({ id: 1, status: 'termine' });
    });

    await waitFor(() => expect(mutation.result.current.isError).toBe(true));

    await waitFor(() => {
      const item = list.result.current.data?.items.find((p) => p.id === 1);
      expect(item?.status).toBe(statutInitial);
    });
  });
});

describe('useDeleteProject', () => {
  it('refuse de supprimer un projet venant de JSONPlaceholder', async () => {
    const { result } = renderHook(() => useDeleteProject(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/lecture seule/);
  });

  it('supprime un projet créé localement', async () => {
    const { result } = renderHook(() => useDeleteProject(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate(150);
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.isError).toBe(false);
  });
});