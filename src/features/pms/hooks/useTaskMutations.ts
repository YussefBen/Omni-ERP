// Créer, modifier, supprimer une tâche

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask, deleteTask, updateTask } from '../services/pmsService';
import { pmsKeys } from './pmsKeys';
import type { CreateTaskPayload, PaginatedTasks, Task, UpdateTaskPayload } from '../types';

// Id négatif temporaire, remplacé par le vrai id une fois le serveur répondu
function nextOptimisticId(): number {
  return -Date.now();
}

// Nouvelle tâche, affichée tout de suite, retirée si le serveur refuse
export function useCreateTask() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createTask,
    onMutate: async (payload: CreateTaskPayload) => {
      await queryClient.cancelQueries({ queryKey: pmsKeys.tasksRoot() });

      const previous = queryClient.getQueriesData<PaginatedTasks>({
        queryKey: pmsKeys.tasksRoot(),
      });

      const optimisticTask: Task = {
        id: nextOptimisticId(),
        projectId: payload.projectId,
        title: payload.title,
        status: payload.status ?? 'a_faire',
        estimatedHours: payload.estimatedHours ?? 0,
        assigneeId: payload.assigneeId,
      };

      queryClient.setQueriesData<PaginatedTasks>(
        { queryKey: pmsKeys.tasksRoot() },
        (old) =>
          old && {
            ...old,
            items: [optimisticTask, ...old.items],
            total: old.total + 1,
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
      // Une tâche en plus change aussi la progression du projet
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
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: pmsKeys.tasksRoot() });

      const previous = queryClient.getQueriesData<PaginatedTasks>({
        queryKey: pmsKeys.tasksRoot(),
      });

      queryClient.setQueriesData<PaginatedTasks>(
        { queryKey: pmsKeys.tasksRoot() },
        (old) =>
          old && {
            ...old,
            items: old.items.filter((t) => t.id !== id),
            total: Math.max(0, old.total - 1),
          },
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
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