// Vue agrégée des compétences 

import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '../services/hrmService';
import { hrmKeys } from './hrmKeys';
import type { Skill } from '../types';

interface UseSkillsResult {
  data: Skill[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSkills(): UseSkillsResult {
  const query = useQuery({
    queryKey: hrmKeys.employees(),
    queryFn: () => fetchEmployees(),
  });

  const data = query.data
    ? Array.from(
        query.data
          .flatMap((e) => e.skills.map((s) => ({ skill: s.name, employeeId: e.id })))
          .reduce((skills, { skill, employeeId }) => {
            const entry = skills.get(skill) ?? { name: skill, employeeCount: 0, employeeIds: [] };
            entry.employeeCount += 1;
            entry.employeeIds.push(employeeId);
            skills.set(skill, entry);
            return skills;
          }, new Map<string, Skill>())
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