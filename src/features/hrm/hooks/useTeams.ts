// Équipes reconstituées en groupant les employés par teamId

import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '../services/hrmService';
import { hrmKeys } from './hrmKeys';
import { teamName } from './hrmLogic';
import type { Team } from '../types';

interface UseTeamsResult {
  data: Team[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useTeams(): UseTeamsResult {
  const query = useQuery({
    queryKey: hrmKeys.employees(),
    queryFn: () => fetchEmployees(),
  });

  const data = query.data
    ? Array.from(
        query.data
          .reduce((teams, employee) => {
            const team = teams.get(employee.teamId) ?? {
              id: employee.teamId,
              name: teamName(employee.teamId),
              memberIds: [],
            };
            team.memberIds.push(employee.id);
            teams.set(employee.teamId, team);
            return teams;
          }, new Map<number, Team>())
          .values(),
      )
    : undefined;

  return {
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}