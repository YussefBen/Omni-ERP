// Département/équipe/compétences inventés depuis l'id, pas de vraie source
import type { EmployeeSkill, SkillLevel } from '../types';

const DEPARTMENTS = ['Développement', 'RH', 'Ventes', 'Support'];
const JOB_TITLES = ['Développeur', 'Chargé RH', 'Commercial', 'Support technique'];
const SKILL_CATALOG = [
  'React',
  'TypeScript',
  'Node.js',
  'SQL',
  'Anglais',
  'Gestion de projet',
  'Design UX',
  'DevOps',
];
const SKILL_LEVELS: SkillLevel[] = ['junior', 'confirme', 'expert'];

export function deriveDepartment(seed: number): string {
  return DEPARTMENTS[seed % DEPARTMENTS.length];
}

export function deriveJobTitle(seed: number): string {
  return JOB_TITLES[seed % JOB_TITLES.length];
}

// Une équipe par département
export function deriveTeamId(seed: number): number {
  return seed % DEPARTMENTS.length;
}

export function teamName(teamId: number): string {
  return DEPARTMENTS[teamId] ?? 'Autre';
}

// 2 ou 3 compétences par employé
export function deriveSkills(seed: number): EmployeeSkill[] {
  const count = 2 + (seed % 2);
  return Array.from({ length: count }, (_, i) => {
    const skillIndex = (seed + i * 3) % SKILL_CATALOG.length;
    const levelIndex = (seed + i) % SKILL_LEVELS.length;
    return { name: SKILL_CATALOG[skillIndex], level: SKILL_LEVELS[levelIndex] };
  });
}