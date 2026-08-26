// Une seule tâche pour un écran de détail
import { useQuery } from '@tanstack/react-query';
import { fetchTaskById } from '../services/pmsService';
import { pmsKeys } from './pmsKeys';
import type { Task } from '../types';

interface UseTaskResult {
  data: Task | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Pas de requête tant qu'il n'y a pas d'id
export function useTask(id?: number): UseTaskResult {
  const query = useQuery({
    queryKey: [...pmsKeys.tasksRoot(), 'detail', id],
    queryFn: () => fetchTaskById(id as number),
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