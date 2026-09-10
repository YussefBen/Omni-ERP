// Liste des projets, paginée, recherche temporisée

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { DEFAULT_PAGE_SIZE } from '@/shared/config/constants';
import { fetchProjects } from '../services/pmsService';
import { pmsKeys } from './pmsKeys';
import type { PaginatedProjects, ProjectFilters } from '../types';

interface UseProjectsResult {
  data: PaginatedProjects | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
  totalPages: number;
}

export function useProjects(filters: ProjectFilters = {}): UseProjectsResult {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const debouncedSearch = useDebounce(filters.search ?? '');

  const appliedFilters: ProjectFilters = {
    page,
    pageSize,
    status: filters.status,
    search: debouncedSearch || undefined,
  };

  const query = useQuery({
    queryKey: pmsKeys.projects(appliedFilters),
    queryFn: () => fetchProjects(appliedFilters),
    // Garde l'ancienne page affichée pendant le chargement de la suivante
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