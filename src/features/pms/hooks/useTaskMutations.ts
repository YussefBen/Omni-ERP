// Créer, modifier, supprimer une tâche

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask, deleteTask, updateTask } from '../services/pmsService';
import { pmsKeys } from './pmsKeys';
import type { PaginatedTasks, UpdateTaskPayload } from '../types';

// Nouvelle tâche, toujours 100% locale
export function useCreateTask() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pmsKeys.tasksRoot() });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// Modifier une tâche (ex. glisser une carte sur un Kanban), optimistic
export function useUpdateTask() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateTask,
    onMutate: async (payload: UpdateTaskPayload) => {
      await queryClient.cancelQueries({ queryKey: pmsKeys.tasksRoot() });

      const previous = queryClient.getQueriesData<PaginatedTasks>({
        queryKey: pmsKeys.tasksRoot(),
      });

      queryClient.setQueriesData<PaginatedTasks>({ queryKey: pmsKeys.tasksRoot() }, (old) =>
        old && {
          ...old,
          items: old.items.map((t) => (t.id === payload.id ? { ...t, ...payload } : t)),
        },
      );

      return { previous };
    },
    onError: (_err, _payload, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: pmsKeys.tasksRoot() });
      void queryClient.invalidateQueries({ queryKey: pmsKeys.projectsRoot() });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

// Supprimer, marche seulement pour une tâche créée localement
export function useDeleteTask() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pmsKeys.tasksRoot() });
      void queryClient.invalidateQueries({ queryKey: pmsKeys.projectsRoot() });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}