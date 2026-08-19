import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { createFeedback, fetchFeedback } from '../services/crmService';
import { crmKeys } from './crmKeys';
import { computeNps, getAverageScore, getScoreDistribution } from './npsLogic';
import type { Feedback, NpsSummary } from '../types';

type CreateFeedbackPayload = Omit<Feedback, 'id' | 'createdAt'>;

interface UseFeedbackResult {
  data: Feedback[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useFeedback(clientId?: number): UseFeedbackResult {
  const query = useQuery({
    queryKey: crmKeys.feedback(clientId),
    queryFn: () => fetchFeedback(clientId),
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

export function useNps(clientId?: number): UseNpsResult {
  const { data, isLoading, isError, error, refetch } = useFeedback(clientId);

  const summary = useMemo(() => (data ? computeNps(data) : undefined), [data]);
  const averageScore = useMemo(() => (data ? getAverageScore(data) : 0), [data]);
  const distribution = useMemo(() => (data ? getScoreDistribution(data) : []), [data]);

  return { data: summary, averageScore, distribution, isLoading, isError, error, refetch };
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();

  const mutation = useMutation<Feedback, Error, CreateFeedbackPayload>({
    mutationFn: createFeedback,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: crmKeys.all });
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