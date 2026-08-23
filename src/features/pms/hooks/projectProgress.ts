// Calcul de la progression d'un projet, depuis ses tâche
import type { Task } from '../types';

// % de tâches terminées pour un projet donné
export function getProjectProgress(projectId: number, tasks: Task[]): number {
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  if (projectTasks.length === 0) return 0;
  const done = projectTasks.filter((t) => t.status === 'termine').length;
  return Math.round((done / projectTasks.length) * 100);
}