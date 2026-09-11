// Clés de cache React Query du domaine RH
import type { EmployeeFilters } from '../types';

export const hrmKeys = {
  all: ['hrm'] as const,

  employees: (filters: EmployeeFilters = {}) => [...hrmKeys.all, 'employees', filters] as const,
  // Préfixe sans les filtres : utilisé pour invalider TOUTES les listes d'employés
  // après une mutation, quel que soit le filtre avec lequel chacune a été chargée.
  employeesRoot: () => [...hrmKeys.all, 'employees'] as const,
  teams: () => [...hrmKeys.all, 'teams'] as const,
  skills: () => [...hrmKeys.all, 'skills'] as const,

  leaveRequests: (employeeId?: number) =>
    [...hrmKeys.all, 'leaveRequests', employeeId ?? 'all'] as const,
  leaveBalance: (employeeId: number) => [...hrmKeys.all, 'leaveBalance', employeeId] as const,

  presence: (employeeId: number) => [...hrmKeys.all, 'presence', employeeId] as const,
};