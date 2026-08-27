import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExport } from './useExport';
import { buildKpi } from './kpiLogic';
import type { AnalyticsResult, KpiDashboard } from '../types';

function makeDashboard(): KpiDashboard {
  const kpi = (label: string) => buildKpi(label, 100, 90);

  return {
    sales: {
      revenue: kpi('CA'),
      orderCount: kpi('Commandes'),
      averageBasket: kpi('Panier'),
      cancellationRate: kpi('Annulations'),
    },
    stock: {
      turnoverRate: kpi('Rotation'),
      daysOfInventory: kpi('Écoulement'),
      lowStockCount: kpi('Alertes'),
      restockValue: kpi('Réassort'),
    },
    crm: {
      pipelineValue: kpi('Pipeline'),
      weightedPipelineValue: kpi('Pondéré'),
      winRate: kpi('Conversion'),
      nps: kpi('NPS'),
    },
    projects: {
      total: kpi('Projets'),
      active: kpi('Actifs'),
      averageProgress: kpi('Avancement'),
      overdue: kpi('Retards'),
    },
    hr: {
      totalEmployees: kpi('Effectif'),
      teamCount: kpi('Équipes'),
      pendingLeaveRequests: kpi('Congés'),
      employeesOnLeaveToday: kpi('Absents'),
    },
    range: {
      current: { from: '2026-06-01T00:00:00.000Z', to: '2026-08-31T00:00:00.000Z' },
      previous: { from: '2026-03-01T00:00:00.000Z', to: '2026-06-01T00:00:00.000Z' },
    },
  } as KpiDashboard;
}

function makeAnalytics(): AnalyticsResult {
  return {
    revenueOverTime: [
      { key: '2026-06', label: 'juin 2026', value: 12000 },
      { key: '2026-07', label: 'juillet 2026', value: 15000 },
    ],
    ordersOverTime: [
      { key: '2026-06', label: 'juin 2026', value: 8 },
      { key: '2026-07', label: 'juillet 2026', value: 11 },
    ],
    salesByCategory: [
      { category: 'smartphones', value: 20000, share: 74.1 },
      { category: 'beauty', value: 7000, share: 25.9 },
    ],
    revenueForecast: { points: [], slope: 3000, confidence: 1 },
  };
}

describe('useExport', () => {
  let clic: ReturnType<typeof vi.fn>;
  let ancre: HTMLAnchorElement;

  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:test');
    globalThis.URL.revokeObjectURL = vi.fn();

    clic = vi.fn();
    ancre = document.createElement('a');
    ancre.click = clic as unknown as () => void;

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
      tag === 'a' ? ancre : document.createElementNS('http://www.w3.org/1999/xhtml', tag),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('n\'est pas en cours d\'export au montage', () => {
    const { result } = renderHook(() => useExport());
    expect(result.current.isExporting).toBe(false);
  });

  it('exporte le tableau de bord en CSV', async () => {
    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.exportDashboard(makeDashboard(), 'csv');
    });

    await waitFor(() => expect(clic).toHaveBeenCalled());
    expect(ancre.download).toMatch(/^indicateurs-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('exporte le chiffre d\'affaires en CSV', async () => {
    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.exportRevenue(makeAnalytics(), 'csv');
    });

    await waitFor(() => expect(clic).toHaveBeenCalled());
    expect(ancre.download).toContain('chiffre-affaires');
  });

  it('exporte la répartition par catégorie en CSV', async () => {
    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.exportCategories(makeAnalytics(), 'csv');
    });

    await waitFor(() => expect(clic).toHaveBeenCalled());
    expect(ancre.download).toContain('ventes-par-categorie');
  });

  it('génère les exports PDF sans erreur', () => {
    const { result } = renderHook(() => useExport());

    expect(() => {
      act(() => {
        result.current.exportDashboard(makeDashboard(), 'pdf');
        result.current.exportRevenue(makeAnalytics(), 'pdf');
        result.current.exportCategories(makeAnalytics(), 'pdf');
      });
    }).not.toThrow();
  });

  // L'indicateur retombe à faux même en cas d'échec : sans cela, le bouton
  // resterait désactivé indéfiniment après une erreur.
  it('libère l\'indicateur après l\'export', async () => {
    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.exportDashboard(makeDashboard(), 'csv');
    });

    await waitFor(() => expect(result.current.isExporting).toBe(false));
  });

  it('ne propage pas l\'erreur au composant appelant', async () => {
    globalThis.URL.createObjectURL = vi.fn(() => {
      throw new Error('Échec de génération');
    });

    const { result } = renderHook(() => useExport());

    expect(() => {
      act(() => {
        result.current.exportDashboard(makeDashboard(), 'csv');
      });
    }).not.toThrow();

    await waitFor(() => expect(result.current.isExporting).toBe(false));
  });

  it('exporte les vingt indicateurs du tableau de bord', async () => {
    let contenu = '';

    globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
      void blob.text().then((texte) => {
        contenu = texte;
      });
      return 'blob:test';
    });

    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.exportDashboard(makeDashboard(), 'csv');
    });

    await waitFor(() => expect(contenu).not.toBe(''));

    // Vingt indicateurs plus la ligne d'en-tête
    expect(contenu.trim().split('\r\n')).toHaveLength(21);
  });
});