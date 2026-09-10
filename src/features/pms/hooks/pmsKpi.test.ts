import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProjectsKPI } from './pmsKpi';
import { deriveDueDate, deriveProjectStatus } from './pmsLogic';

afterEach(() => {
  vi.useRealTimers();
});

describe('getProjectsKPI', () => {
  it('compte les 5 projets de la fixture', async () => {
    const kpi = await getProjectsKPI();
    expect(kpi.total).toBe(5);
  });

  it('distingue actifs et terminés selon le statut dérivé', async () => {
    const kpi = await getProjectsKPI();
    const completedCount = [1, 2, 3, 4, 5].filter(
      (id) => deriveProjectStatus(id) === 'termine',
    ).length;

    expect(kpi.completed).toBe(completedCount);
    expect(kpi.active).toBe(5 - completedCount);
  });

  it('calcule une progression moyenne entre 0 et 100', async () => {
    const kpi = await getProjectsKPI();
    expect(kpi.averageProgress).toBeGreaterThanOrEqual(0);
    expect(kpi.averageProgress).toBeLessThanOrEqual(100);
  });

  it('compte les projets en retard, avec la même règle que dueDate', async () => {
    vi.setSystemTime(new Date('2026-08-15T12:00:00.000Z'));
    const kpi = await getProjectsKPI();

    const today = new Date().toISOString().slice(0, 10);
    const expectedOverdue = [1, 2, 3, 4, 5].filter((id) => {
      const status = deriveProjectStatus(id);
      const dueDate = deriveDueDate(id);
      return status !== 'termine' && dueDate < today;
    }).length;

    expect(kpi.overdue).toBe(expectedOverdue);
  });

  it('accepte le paramètre previous sans erreur', async () => {
    const kpi = await getProjectsKPI(true);
    expect(kpi.total).toBe(5);
  });
});