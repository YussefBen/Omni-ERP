// Statut des APIs, rafraîchi tout seul toutes les 60s
import { useQuery } from '@tanstack/react-query';
import { fetchHealthChecks } from '../services/healthCheckService';
import type { ServiceHealth } from '../types';

interface UseHealthChecksResult {
  data: ServiceHealth[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useHealthChecks(): UseHealthChecksResult {
  const query = useQuery({
    queryKey: ['monitoring', 'health'],
    queryFn: fetchHealthChecks,
    refetchInterval: 60_000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}