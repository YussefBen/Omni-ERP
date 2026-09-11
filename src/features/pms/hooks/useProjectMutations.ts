// Créer, modifier, supprimer un projet

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProject, deleteProject, updateProject } from '../services/pmsService';
import { pmsKeys } from './pmsKeys';
import type { CreateProjectPayload, PaginatedProjects, Project, UpdateProjectPayload } from '../types';

// Id négatif temporaire, remplacé par le vrai id une fois le serveur répondu
function nextOptimisticId(): number {
  return -Date.now();
}

// Nouveau projet, affiché tout de suite en tête de liste, retiré si le serveur refuse
export function useCreateProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createProject,
    onMutate: async (payload: CreateProjectPayload) => {
      await queryClient.cancelQueries({ queryKey: pmsKeys.projectsRoot() });

      const previous = queryClient.getQueriesData<PaginatedProjects>({
        queryKey: pmsKeys.projectsRoot(),
      });

      const optimisticProject: Project = {
        id: nextOptimisticId(),
        title: payload.title,
        description: payload.description,
        ownerId: payload.ownerId,
        status: payload.status ?? 'a_faire',
        dueDate: payload.dueDate ?? new Date().toISOString(),
        progress: 0,
      };

      queryClient.setQueriesData<PaginatedProjects>(
        { queryKey: pmsKeys.projectsRoot() },
        (old) =>
          old && {
            ...old,
            items: [optimisticProject, ...old.items],
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

// Modifier un projet, affiché tout de suite, annulé si le serveur refuse
export function useUpdateProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateProject,
    onMutate: async (payload: UpdateProjectPayload) => {
      await queryClient.cancelQueries({ queryKey: pmsKeys.projectsRoot() });

      const previous = queryClient.getQueriesData<PaginatedProjects>({
        queryKey: pmsKeys.projectsRoot(),
      });

      queryClient.setQueriesData<PaginatedProjects>(
        { queryKey: pmsKeys.projectsRoot() },
        (old) =>
          old && {
            ...old,
            items: old.items.map((p) => (p.id === payload.id ? { ...p, ...payload } : p)),
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

// Supprimer, marche seulement pour un projet créé localement
export function useDeleteProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: deleteProject,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: pmsKeys.projectsRoot() });

      const previous = queryClient.getQueriesData<PaginatedProjects>({
        queryKey: pmsKeys.projectsRoot(),
      });

      queryClient.setQueriesData<PaginatedProjects>(
        { queryKey: pmsKeys.projectsRoot() },
        (old) =>
          old && {
            ...old,
            items: old.items.filter((p) => p.id !== id),
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