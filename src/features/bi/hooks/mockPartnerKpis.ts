// Indicateurs projets simulés, en attendant getProjectsKPI() du Membre A.
// Structure convenue avec l'équipe : le jour de la livraison, seul l'import
// de useKPIs change, aucun composant n'est touché.
// Les indicateurs RH sont livrés depuis @/features/hrm.

import type { ProjectsKpiRaw } from '../types';

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

export function getMockProjectsKPI(previous = false): ProjectsKpiRaw {
  return previous ? PROJECTS_PREVIOUS : PROJECTS_CURRENT;
}