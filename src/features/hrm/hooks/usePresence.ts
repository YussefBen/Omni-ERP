// Présence du jour

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkIn, checkOut, fetchPresenceToday } from '../services/hrmService';
import { hrmKeys } from './hrmKeys';
import type { PresenceEntry } from '../types';

interface UsePresenceResult {
  data: PresenceEntry | null | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePresence(employeeId: number): UsePresenceResult {
  const query = useQuery({
    queryKey: hrmKeys.presence(employeeId),
    queryFn: () => fetchPresenceToday(employeeId),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

export function useCheckIn(employeeId: number) {
  const queryClient = useQueryClient();

  const mutation = useMutation<PresenceEntry, Error, void>({
    mutationFn: () => checkIn(employeeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrmKeys.presence(employeeId) });
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

// entryId vient de la donnée renvoyée par usePresence()
export function useCheckOut(employeeId: number) {
  const queryClient = useQueryClient();

  const mutation = useMutation<PresenceEntry, Error, number>({
    mutationFn: (entryId) => checkOut(entryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrmKeys.presence(employeeId) });
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