// Tâches d'un projet (ou toutes), paginées
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE } from '@/shared/config/constants';
import { fetchTasks } from '../services/pmsService';
import { pmsKeys } from './pmsKeys';
import type { PaginatedTasks, TaskFilters } from '../types';

interface UseTasksResult {
  data: PaginatedTasks | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
  totalPages: number;
}

// projectId absent = toutes les tâches, tous projets confondus
export function useTasks(
  projectId?: number,
  filters: Omit<TaskFilters, 'projectId'> = {},
): UseTasksResult {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  const appliedFilters: TaskFilters = {
    page,
    pageSize,
    projectId,
    status: filters.status,
  };

  const query = useQuery({
    queryKey: pmsKeys.tasks(appliedFilters),
    queryFn: () => fetchTasks(appliedFilters),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
    isFetching: query.isFetching,
    totalPages: query.data ? Math.ceil(query.data.total / pageSize) : 0,
  };
}