// KPI Projets pour la BI de B, previous=true pour la période précédente

import { fetchAllProjects } from '../services/pmsService';
import type { ProjectsKPI } from '../types';

// Décalage pour simuler la période précédente
const PREVIOUS_PERIOD_OFFSET_DAYS = 30;

export async function getProjectsKPI(previous = false): Promise<ProjectsKPI> {
  const projects = await fetchAllProjects();

  // Pas d'historique de progression, mêmes valeurs des deux côtés
  const total = projects.length;
  const completed = projects.filter((p) => p.status === 'termine').length;
  const active = total - completed;
  const averageProgress =
    total === 0 ? 0 : Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / total);

  // Seul overdue a une vraie date à comparer (dueDate)
  const referenceDate = previous
    ? new Date(Date.now() - PREVIOUS_PERIOD_OFFSET_DAYS * 24 * 60 * 60 * 1000)
    : new Date();
  const referenceDateStr = referenceDate.toISOString().slice(0, 10);
  const overdue = projects.filter(
    (p) => p.status !== 'termine' && p.dueDate < referenceDateStr,
  ).length;

  return { total, active, completed, averageProgress, overdue };
}