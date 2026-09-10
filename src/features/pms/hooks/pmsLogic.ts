// Statut/échéance/heures inventés

import type { ProjectStatus, TaskStatus } from '../types';

const PROJECT_STATUSES: ProjectStatus[] = ['a_faire', 'en_cours', 'termine', 'en_pause'];
const TASK_STATUSES: TaskStatus[] = ['a_faire', 'en_cours', 'termine'];

// Les identifiants n'ont pas la même forme selon leur origine : JSONPlaceholder
// numérote ses éléments, alors que JSON Server attribue des chaînes
// alphanumériques aux enregistrements créés depuis l'application.
// Sans cette normalisation, un calcul modulo sur une chaîne produit NaN,
// et la date dérivée devient invalide.
function toSeed(seed: number | string): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) return Math.abs(seed);

  const text = String(seed ?? '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 100000;
  }
  return hash;
}

export function deriveProjectStatus(seed: number | string): ProjectStatus {
  return PROJECT_STATUSES[toSeed(seed) % PROJECT_STATUSES.length];
}

// Étalé entre -30 et +30 jours, pour avoir des projets déjà en retard
export function deriveDueDate(seed: number | string): string {
  const offsetDays = (toSeed(seed) % 61) - 30;
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export function deriveTaskStatus(seed: number | string): TaskStatus {
  return TASK_STATUSES[toSeed(seed) % TASK_STATUSES.length];
}

export function deriveEstimatedHours(seed: number | string): number {
  return 2 + (toSeed(seed) % 6) * 2;
}

// JSONPlaceholder ne relie pas les todos à un projet, donc on invente le lien
export function deriveProjectIdForTask(
  taskSeed: number | string,
  projectCount: number,
): number {
  if (projectCount <= 0) return 1;
  return (toSeed(taskSeed) % projectCount) + 1;
}