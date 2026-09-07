// Statut des APIs, rafraîchi tout seul toutes les 60s
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHealthChecks } from '../services/healthCheckService';
import { notifyServiceOutages } from '../services/outageAlerts';
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

  // Alerte Slack si un service passe down, à chaque nouveau résultat
  useEffect(() => {
    if (query.data) notifyServiceOutages(query.data);
  }, [query.data]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}