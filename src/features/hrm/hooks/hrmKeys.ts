// Clés de cache React Query du domaine RH
import type { EmployeeFilters } from '../types';

export const hrmKeys = {
  all: ['hrm'] as const,

  employees: (filters: EmployeeFilters = {}) => [...hrmKeys.all, 'employees', filters] as const,
  teams: () => [...hrmKeys.all, 'teams'] as const,
  skills: () => [...hrmKeys.all, 'skills'] as const,

  leaveRequests: (employeeId?: number) =>
    [...hrmKeys.all, 'leaveRequests', employeeId ?? 'all'] as const,
  leaveBalance: (employeeId: number) => [...hrmKeys.all, 'leaveBalance', employeeId] as const,

  presence: (employeeId: number) => [...hrmKeys.all, 'presence', employeeId] as const,
};