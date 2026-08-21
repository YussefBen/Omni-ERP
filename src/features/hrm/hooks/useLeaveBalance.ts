// Solde de congés

import { useQuery } from '@tanstack/react-query';
import { fetchLeaveRequests } from '../services/hrmService';
import { hrmKeys } from './hrmKeys';
import type { LeaveBalance } from '../types';

// 25 jours/an en dur (pas de vraie donnée RH pour çaà
const ANNUAL_LEAVE_DAYS = 25;

function countLeaveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

interface UseLeaveBalanceResult {
  data: LeaveBalance | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLeaveBalance(employeeId: number): UseLeaveBalanceResult {
  const query = useQuery({
    queryKey: hrmKeys.leaveBalance(employeeId),
    queryFn: async () => {
      const requests = await fetchLeaveRequests(employeeId);
      const usedDays = requests
        .filter((r) => r.status === 'approved')
        .reduce((total, r) => total + countLeaveDays(r.startDate, r.endDate), 0);

      const balance: LeaveBalance = {
        employeeId,
        totalDays: ANNUAL_LEAVE_DAYS,
        usedDays,
        remainingDays: ANNUAL_LEAVE_DAYS - usedDays,
      };
      return balance;
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}