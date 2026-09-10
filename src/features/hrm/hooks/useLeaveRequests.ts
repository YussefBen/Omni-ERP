// Demandes de congés : lecture, création, validation/refus
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLeaveRequest,
  fetchLeaveRequests,
  updateLeaveStatus,
} from '../services/hrmService';
import { hrmKeys } from './hrmKeys';
import type { CreateLeaveRequestPayload, LeaveRequest, UpdateLeaveStatusPayload } from '../types';

interface UseLeaveRequestsResult {
  data: LeaveRequest[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLeaveRequests(employeeId?: number): UseLeaveRequestsResult {
  const query = useQuery({
    queryKey: hrmKeys.leaveRequests(employeeId),
    queryFn: () => fetchLeaveRequests(employeeId),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

//  demande faite par un employé
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  const mutation = useMutation<LeaveRequest, Error, CreateLeaveRequestPayload>({
    mutationFn: createLeaveRequest,
    onSuccess: (_data, { employeeId }) => {
      void queryClient.invalidateQueries({ queryKey: hrmKeys.leaveRequests(employeeId) });
      void queryClient.invalidateQueries({ queryKey: hrmKeys.leaveRequests(undefined) });
      void queryClient.invalidateQueries({ queryKey: hrmKeys.leaveBalance(employeeId) });
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

// Validation ou refus, fait par un manager
export function useUpdateLeaveStatus() {
  const queryClient = useQueryClient();

  const mutation = useMutation<LeaveRequest, Error, UpdateLeaveStatusPayload>({
    mutationFn: updateLeaveStatus,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: hrmKeys.leaveRequests(data.employeeId) });
      void queryClient.invalidateQueries({ queryKey: hrmKeys.leaveRequests(undefined) });
      void queryClient.invalidateQueries({ queryKey: hrmKeys.leaveBalance(data.employeeId) });
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