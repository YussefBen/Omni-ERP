import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper';
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from './useComments';

function renderListAndMutation<T>(useMutationHook: () => T, target: { projectId?: number }) {
  const client = createTestQueryClient();
  const wrapper = createWrapper(client);

  const list = renderHook(() => useComments(target), { wrapper });
  const mutation = renderHook(useMutationHook, { wrapper });

  return { client, list, mutation };
}

describe('useComments', () => {
  it('charge les commentaires d\'un projet', async () => {
    const { result } = renderHook(() => useComments({ projectId: 1 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].projectId).toBe(1);
  });

  it('renvoie un tableau vide pour un projet sans commentaire', async () => {
    const { result } = renderHook(() => useComments({ projectId: 999 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(0);
  });
});

describe('useCreateComment', () => {
  it('ajoute un commentaire à la liste du projet', async () => {
    const { list, mutation } = renderListAndMutation(useCreateComment, { projectId: 1 });
    await waitFor(() => expect(list.result.current.data).toHaveLength(1));

    act(() => {
      mutation.result.current.mutate({ projectId: 1, authorId: 2, content: 'Un avis' });
    });

    await waitFor(() => expect(list.result.current.data).toHaveLength(2));
  });
});

describe('useUpdateComment', () => {
  it('modifie le texte d\'un commentaire', async () => {
    const { list, mutation } = renderListAndMutation(useUpdateComment, { projectId: 1 });
    await waitFor(() => expect(list.result.current.data).toHaveLength(1));

    act(() => {
      mutation.result.current.mutate({ id: 1, content: 'Texte modifié' });
    });

    await waitFor(() => {
      expect(list.result.current.data?.[0].content).toBe('Texte modifié');
    });
  });
});

describe('useDeleteComment', () => {
  it('supprime un commentaire de la liste', async () => {
    const { list, mutation } = renderListAndMutation(useDeleteComment, { projectId: 1 });
    await waitFor(() => expect(list.result.current.data).toHaveLength(1));

    act(() => {
      mutation.result.current.mutate(1);
    });

    await waitFor(() => expect(list.result.current.data).toHaveLength(0));
  });
});