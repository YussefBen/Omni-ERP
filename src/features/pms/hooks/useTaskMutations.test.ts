import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper';
import { useTasks } from './useTasks';
import { useCreateTask, useDeleteTask, useUpdateTask } from './useTaskMutations';
import type { Task } from '../types';

const LOCAL = 'http://localhost:3001';

function renderListAndMutation<T>(useMutationHook: () => T) {
  const client = createTestQueryClient();
  const wrapper = createWrapper(client);

  const list = renderHook(() => useTasks(undefined, { pageSize: 20 }), { wrapper });
  const mutation = renderHook(useMutationHook, { wrapper });

  return { client, list, mutation };
}

describe('useCreateTask', () => {
  it('crée une tâche 100% locale, au-delà des ids JSONPlaceholder', async () => {
    const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper() });

    let created: Task | undefined;
    await act(async () => {
      created = await result.current.mutateAsync({ projectId: 1, title: 'Nouvelle tâche' });
    });

    expect(created).toMatchObject({ title: 'Nouvelle tâche', status: 'a_faire' });
    expect(created?.id).toBeGreaterThan(5);
  });
});

describe('useUpdateTask', () => {
  it('affiche le déplacement immédiatement (optimistic update, cas Kanban)', async () => {
    const { list, mutation } = renderListAndMutation(useUpdateTask);
    await waitFor(() => expect(list.result.current.data?.items.length).toBeGreaterThan(0));

    server.use(
      http.post(`${LOCAL}/tasks`, async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({ status: 'en_cours' });
      }),
    );

    act(() => {
      mutation.result.current.mutate({ id: 4, status: 'en_cours' });
    });

    await waitFor(() => {
      const item = list.result.current.data?.items.find((t) => t.id === 4);
      expect(item?.status).toBe('en_cours');
    });
  });

  it('annule le déplacement si le serveur refuse (rollback)', async () => {
    const { list, mutation } = renderListAndMutation(useUpdateTask);
    await waitFor(() => expect(list.result.current.data?.items.length).toBeGreaterThan(0));

    const statutInitial = list.result.current.data?.items.find((t) => t.id === 4)?.status;

    server.use(http.post(`${LOCAL}/tasks`, () => new HttpResponse(null, { status: 500 })));

    act(() => {
      mutation.result.current.mutate({ id: 4, status: 'en_cours' });
    });

    await waitFor(() => expect(mutation.result.current.isError).toBe(true));

    await waitFor(() => {
      const item = list.result.current.data?.items.find((t) => t.id === 4);
      expect(item?.status).toBe(statutInitial);
    });
  });
});

describe('useDeleteTask', () => {
  it('refuse de supprimer une tâche venant de JSONPlaceholder', async () => {
    const { result } = renderHook(() => useDeleteTask(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/lecture seule/);
  });

  it('supprime une tâche créée localement', async () => {
    const { result } = renderHook(() => useDeleteTask(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate(250);
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.isError).toBe(false);
  });
});