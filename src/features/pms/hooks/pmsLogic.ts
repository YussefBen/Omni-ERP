// Statut/échéance/heures inventés

import type { ProjectStatus, TaskStatus } from '../types';

const PROJECT_STATUSES: ProjectStatus[] = ['a_faire', 'en_cours', 'termine', 'en_pause'];
const TASK_STATUSES: TaskStatus[] = ['a_faire', 'en_cours', 'termine'];

export function deriveProjectStatus(seed: number): ProjectStatus {
  return PROJECT_STATUSES[seed % PROJECT_STATUSES.length];
}

// Étalé entre -30 et +30 jours, pour avoir des projets déjà en retard
export function deriveDueDate(seed: number): string {
  const offsetDays = (seed % 61) - 30;
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

export function deriveTaskStatus(seed: number): TaskStatus {
  return TASK_STATUSES[seed % TASK_STATUSES.length];
}

export function deriveEstimatedHours(seed: number): number {
  return 2 + (seed % 6) * 2;
}

// JSONPlaceholder ne relie pas les todos à un projet, donc on invente le lien
export function deriveProjectIdForTask(taskSeed: number, projectCount: number): number {
  return (taskSeed % projectCount) + 1;
}