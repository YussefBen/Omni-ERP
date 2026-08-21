// Compare des compétences demandées à ce qui est dispo dans l'équipe   
import type { Employee, SkillGapEntry } from '../types';

export function getSkillGapAnalysis(
  requiredSkills: string[],
  employees: Employee[],
): SkillGapEntry[] {
  return requiredSkills.map((skill) => {
    const availableCount = employees.filter((e) =>
      e.skills.some((s) => s.name === skill),
    ).length;
    return { skill, covered: availableCount > 0, availableCount };
  });
}