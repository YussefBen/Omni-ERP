import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/queryWrapper';
import { deriveProjectIdForTask } from './pmsLogic';
import { useTasks } from './useTasks';

describe('useTasks', () => {
  it('charge toutes les tâches quand aucun projectId n\'est donné', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.total).toBe(5);
  });

  it('déduit le statut depuis "completed" quand la tâche n\'est pas terminée', async () => {
    const { result } = renderHook(() => useTasks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const task4 = result.current.data?.items.find((t) => t.id === 4);
    expect(task4?.status).not.toBe('termine');

    const task1 = result.current.data?.items.find((t) => t.id === 1);
    expect(task1?.status).toBe('termine');
  });

  it('filtre par projet, avec le même lien projet<->tâche que le service', async () => {
    const projectId = deriveProjectIdForTask(1, 100);
    const { result } = renderHook(() => useTasks(projectId), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.items.some((t) => t.id === 1)).toBe(true);
    expect(result.current.data?.items.every((t) => t.projectId === projectId)).toBe(true);
  });
});