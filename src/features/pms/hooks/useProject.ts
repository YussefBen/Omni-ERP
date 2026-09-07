// Un seul projet pour un écran de détail
import { useQuery } from '@tanstack/react-query';
import { fetchProjectById } from '../services/pmsService';
import { pmsKeys } from './pmsKeys';
import type { Project } from '../types';

interface UseProjectResult {
  data: Project | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Pas de requête tant qu'il n'y a pas d'id
export function useProject(id?: number): UseProjectResult {
  const query = useQuery({
    queryKey: [...pmsKeys.projectsRoot(), 'detail', id],
    queryFn: () => fetchProjectById(id as number),
    enabled: id !== undefined,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}