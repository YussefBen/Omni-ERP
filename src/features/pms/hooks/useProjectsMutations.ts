// Créer, modifier, supprimer un projet
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProject, deleteProject, updateProject } from '../services/pmsService';
import { pmsKeys } from './pmsKeys';
import type {
  CreateProjectPayload,
  PaginatedProjects,
  Project,
  UpdateProjectPayload,
} from '../types';

// Nouveau projet, toujours 100% local
export function useCreateProject() {
  const queryClient = useQueryClient();

  const mutation = useMutation<Project, Error, CreateProjectPayload>({
    mutationFn: createProject,
    onSuccess: () => {
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

  const mutation = useMutation
    unknown,
    Error,
    UpdateProjectPayload,
    { previous: Array<[readonly unknown[], PaginatedProjects | undefined]> }
  >({
    mutationFn: updateProject,
    onMutate: async (payload) => {
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

  const mutation = useMutation<void, Error, number>({
    mutationFn: deleteProject,
    onSuccess: () => {
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