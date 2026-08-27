import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/test/queryWrapper';

// Les indicateurs projets et RH viennent des domaines du Membre A.
// On les simule ici : le test porte sur l'agrégation, pas sur leur calcul.
vi.mock('@/features/hrm', () => ({
  getHRKPI: vi.fn(async (previous = false) =>
    previous
      ? { totalEmployees: 84, teamCount: 9, pendingLeaveRequests: 17, employeesOnLeaveToday: 4 }
      : { totalEmployees: 87, teamCount: 9, pendingLeaveRequests: 12, employeesOnLeaveToday: 6 },
  ),
}));

vi.mock('@/features/pms', () => ({
  getProjectsKPI: vi.fn(async (previous = false) =>
    previous
      ? { total: 21, active: 12, completed: 6, averageProgress: 58, overdue: 5 }
      : { total: 24, active: 11, completed: 9, averageProgress: 63, overdue: 3 },
  ),
}));

const { useKPIs } = await import('./useKPIs');
const { useAnalytics } = await import('./useAnalytics');

describe('useKPIs', () => {
  it('assemble les cinq domaines', async () => {
    const { result } = renderHook(() => useKPIs(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 3000 });

    expect(result.current.data).toHaveProperty('sales');
    expect(result.current.data).toHaveProperty('stock');
    expect(result.current.data).toHaveProperty('crm');
    expect(result.current.data).toHaveProperty('projects');
    expect(result.current.data).toHaveProperty('hr');
  });

  it('branche les indicateurs du Membre A', async () => {
    const { result } = renderHook(() => useKPIs(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 3000 });

    expect(result.current.data?.hr.totalEmployees.value).toBe(87);
    expect(result.current.data?.projects.total.value).toBe(24);
  });

  it('expose la période comparée', async () => {
    const { result } = renderHook(() => useKPIs(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 3000 });

    expect(result.current.data?.range.current).toBeDefined();
    expect(result.current.data?.range.previous).toBeDefined();
    expect(result.current.data?.range.previous.to).toBe(result.current.data?.range.current.from);
  });

  it('adapte la période au préréglage demandé', async () => {
    const trimestre = renderHook(() => useKPIs('trois-mois'), { wrapper: createWrapper() });
    const semestre = renderHook(() => useKPIs('six-mois'), { wrapper: createWrapper() });

    await waitFor(() => expect(trimestre.result.current.data).toBeDefined(), { timeout: 3000 });
    await waitFor(() => expect(semestre.result.current.data).toBeDefined(), { timeout: 3000 });

    const debutTrimestre = new Date(trimestre.result.current.data!.range.current.from);
    const debutSemestre = new Date(semestre.result.current.data!.range.current.from);

    expect(debutSemestre.getTime()).toBeLessThan(debutTrimestre.getTime());
  });

  // Toutes les sources doivent avoir répondu avant que les indicateurs
  // soient exposés : un tableau de bord partiel serait trompeur.
  it('reste en chargement tant qu\'une source n\'a pas répondu', () => {
    const { result } = renderHook(() => useKPIs(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('propage l\'échec d\'une seule source', async () => {
    server.use(
      http.get('https://dummyjson.com/carts', () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useKPIs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
    expect(result.current.data).toBeUndefined();
  });
});

describe('useAnalytics', () => {
  it('produit les séries temporelles', async () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 3000 });

    expect(Array.isArray(result.current.data?.revenueOverTime)).toBe(true);
    expect(Array.isArray(result.current.data?.ordersOverTime)).toBe(true);
  });

  it('répartit les ventes par catégorie', async () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 3000 });

    const parts = result.current.data?.salesByCategory ?? [];
    expect(parts.length).toBeGreaterThan(0);

    const total = parts.reduce((somme, part) => somme + part.share, 0);
    expect(Math.round(total)).toBe(100);
  });

  it('prolonge la série par une prévision', async () => {
    const { result } = renderHook(() => useAnalytics(2), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 3000 });

    const prevision = result.current.data?.revenueForecast;

    expect(prevision).toBeDefined();
    expect(typeof prevision?.confidence).toBe('number');
  });

  it('identifie le meilleur et le pire mois', async () => {
    const { result } = renderHook(() => useAnalytics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 3000 });

    if ((result.current.data?.revenueOverTime.length ?? 0) > 1) {
      expect(result.current.best).toBeDefined();
      expect(result.current.worst).toBeDefined();
      expect(result.current.best!.value).toBeGreaterThanOrEqual(result.current.worst!.value);
    }
  });

  it('signale une erreur de chargement', async () => {
    server.use(
      http.get('https://dummyjson.com/carts', () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useAnalytics(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
  });
});