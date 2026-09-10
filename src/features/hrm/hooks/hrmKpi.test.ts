import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHRKPI } from './hrmKpi';

afterEach(() => {
  vi.useRealTimers();
});

describe('getHRKPI', () => {
  it('compte les 12 employés du roster Reqres', async () => {
    const kpi = await getHRKPI();
    expect(kpi.totalEmployees).toBe(12);
  });

  it('compte 4 équipes, une par département', async () => {
    const kpi = await getHRKPI();
    expect(kpi.teamCount).toBe(4);
  });

  it('compte les demandes en attente', async () => {
    const kpi = await getHRKPI();
    expect(kpi.pendingLeaveRequests).toBe(1);
  });

  it('détecte un employé en congé à la date courante', async () => {
    vi.setSystemTime(new Date('2026-08-12T10:00:00.000Z'));
    const kpi = await getHRKPI();
    expect(kpi.employeesOnLeaveToday).toBe(1);
  });

  it('applique le même décalage de 30 jours pour la période précédente', async () => {
    vi.setSystemTime(new Date('2026-09-11T10:00:00.000Z'));
    const kpi = await getHRKPI(true);
    expect(kpi.employeesOnLeaveToday).toBe(1);
  });

  it('ne trouve personne en congé hors de la période', async () => {
    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
    const kpi = await getHRKPI();
    expect(kpi.employeesOnLeaveToday).toBe(0);
  });
});