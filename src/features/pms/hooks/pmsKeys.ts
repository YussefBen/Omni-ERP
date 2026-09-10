// Clés de cache React Query du domaine PMS
import type { CommentTarget, ProjectFilters, TaskFilters } from '../types';

export const pmsKeys = {
  all: ['pms'] as const,

  // Racines pour cibler tout le cache projets/tâches (optimistic update)
  projectsRoot: () => [...pmsKeys.all, 'projects'] as const,
  projects: (filters: ProjectFilters = {}) => [...pmsKeys.projectsRoot(), filters] as const,

  tasksRoot: () => [...pmsKeys.all, 'tasks'] as const,
  tasks: (filters: TaskFilters = {}) => [...pmsKeys.tasksRoot(), filters] as const,

  comments: (target: CommentTarget = {}) => [...pmsKeys.all, 'comments', target] as const,
};