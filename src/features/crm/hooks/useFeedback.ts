// Hooks du feedback client : lecture et indicateurs de satisfaction.
// Source JSONPlaceholder /comments, en lecture seule.

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchFeedback } from '../services/crmService';
import { crmKeys } from './crmKeys';
import { computeNps, getAverageScore, getScoreDistribution } from './npsLogic';
import type { Feedback, NpsSummary } from '../types';

interface UseFeedbackResult {
  data: Feedback[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Feedback de tous les clients, ou d'un seul si un identifiant est fourni.
export function useFeedback(clientId?: number): UseFeedbackResult {
  const query = useQuery({
    queryKey: crmKeys.feedback(clientId),
    queryFn: () => fetchFeedback(clientId),
    // Les scores étant dérivés de façon déterministe, les données ne bougent pas.
    staleTime: 1000 * 60 * 30,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

interface UseNpsResult {
  data: NpsSummary | undefined;
  averageScore: number;
  distribution: Array<{ score: number; count: number }>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Indicateurs de satisfaction dérivés du feedback. Les calculs sont mémoïsés :
// ils ne sont refaits que lorsque les données changent, pas à chaque rendu.
export function useNps(clientId?: number): UseNpsResult {
  const { data, isLoading, isError, error, refetch } = useFeedback(clientId);

  const summary = useMemo(() => (data ? computeNps(data) : undefined), [data]);
  const averageScore = useMemo(() => (data ? getAverageScore(data) : 0), [data]);
  const distribution = useMemo(() => (data ? getScoreDistribution(data) : []), [data]);

  return { data: summary, averageScore, distribution, isLoading, isError, error, refetch };
}