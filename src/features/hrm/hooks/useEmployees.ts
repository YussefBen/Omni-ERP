// Liste des employés, avec recherche et filtres

import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '../services/hrmService';
import { hrmKeys } from './hrmKeys';
import type { Employee, EmployeeFilters } from '../types';

interface UseEmployeesResult {
  data: Employee[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useEmployees(filters: EmployeeFilters = {}): UseEmployeesResult {
  const query = useQuery({
    queryKey: hrmKeys.employees(filters),
    queryFn: () => fetchEmployees(filters),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}