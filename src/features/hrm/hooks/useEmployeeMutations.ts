// Administration des employés : création, modification, suppression.
// Réservée aux rôles admin/manager côté écran (voir EmployeeAdminPanel).

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEmployee, deleteEmployee, updateEmployee } from '../services/hrmService';
import { hrmKeys } from './hrmKeys';
import type { CreateEmployeePayload, EmployeeOverride, UpdateEmployeePayload } from '../types';

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  const mutation = useMutation<EmployeeOverride, Error, CreateEmployeePayload>({
    mutationFn: createEmployee,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrmKeys.employeesRoot() });
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

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  const mutation = useMutation<EmployeeOverride, Error, UpdateEmployeePayload>({
    mutationFn: updateEmployee,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrmKeys.employeesRoot() });
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

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, number>({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: hrmKeys.employeesRoot() });
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