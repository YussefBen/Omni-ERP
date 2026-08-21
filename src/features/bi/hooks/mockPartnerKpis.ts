// Indicateurs projets et RH simulés, en attendant getProjectsKPI() et getHRKPI()
// du Membre A. Structures convenues avec l'équipe : le jour de la livraison,
// seuls les imports de useKPIs changent, aucun composant n'est touché.

import type { HrKpiRaw, ProjectsKpiRaw } from '../types';

// Valeurs figées et non aléatoires : un indicateur qui change à chaque
// rafraîchissement rendrait la comparaison de période incompréhensible.
const PROJECTS_CURRENT: ProjectsKpiRaw = {
  total: 24,
  active: 11,
  completed: 9,
  averageProgress: 63,
  overdue: 3,
};

const PROJECTS_PREVIOUS: ProjectsKpiRaw = {
  total: 21,
  active: 12,
  completed: 6,
  averageProgress: 58,
  overdue: 5,
};

const HR_CURRENT: HrKpiRaw = {
  totalEmployees: 87,
  teamCount: 9,
  pendingLeaveRequests: 12,
  employeesOnLeaveToday: 6,
};

const HR_PREVIOUS: HrKpiRaw = {
  totalEmployees: 84,
  teamCount: 9,
  pendingLeaveRequests: 17,
  employeesOnLeaveToday: 4,
};

export function getMockProjectsKPI(previous = false): ProjectsKpiRaw {
  return previous ? PROJECTS_PREVIOUS : PROJECTS_CURRENT;
}

export function getMockHRKPI(previous = false): HrKpiRaw {
  return previous ? HR_PREVIOUS : HR_CURRENT;
}