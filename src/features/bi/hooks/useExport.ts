// Export des rapports BI. Le hook expose des actions prêtes à brancher
// sur des boutons, sans que l'écran ait à connaître le format de sortie.

import { useCallback, useState } from 'react';
import { notifyError, notifySuccess } from '@/features/dashboard';
import {
  CATEGORY_COLUMNS,
  KPI_COLUMNS,
  TIME_SERIES_COLUMNS,
  exportToCsv,
  exportToPdf,
  flattenDashboard,
  getTimestampedName,
} from '../services/exportService';
import type { AnalyticsResult, KpiDashboard } from '../types';

type ExportFormat = 'csv' | 'pdf';

interface UseExportResult {
  exportDashboard: (dashboard: KpiDashboard, format: ExportFormat) => void;
  exportRevenue: (analytics: AnalyticsResult, format: ExportFormat) => void;
  exportCategories: (analytics: AnalyticsResult, format: ExportFormat) => void;
  isExporting: boolean;
}

export function useExport(): UseExportResult {
  const [isExporting, setIsExporting] = useState(false);

  // La génération est synchrone mais peut bloquer brièvement sur un gros
  // volume : l'indicateur permet de désactiver le bouton entre-temps.
  const run = useCallback((action: () => void, label: string) => {
    setIsExporting(true);
    try {
      action();
      notifySuccess(`${label} exporté`, 'bi');
    } catch {
      notifyError(`Échec de l'export : ${label}`, 'bi');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportDashboard = useCallback(
    (dashboard: KpiDashboard, format: ExportFormat) => {
      const rows = flattenDashboard(dashboard);
      const name = getTimestampedName('indicateurs', format);

      run(() => {
        if (format === 'csv') {
          exportToCsv(rows, KPI_COLUMNS, name);
        } else {
          exportToPdf(rows, KPI_COLUMNS, name, {
            title: 'Tableau de bord des indicateurs',
            subtitle: 'Comparaison avec la période précédente',
          });
        }
      }, 'Tableau de bord');
    },
    [run],
  );

  const exportRevenue = useCallback(
    (analytics: AnalyticsResult, format: ExportFormat) => {
      const name = getTimestampedName('chiffre-affaires', format);

      run(() => {
        if (format === 'csv') {
          exportToCsv(analytics.revenueOverTime, TIME_SERIES_COLUMNS, name);
        } else {
          exportToPdf(analytics.revenueOverTime, TIME_SERIES_COLUMNS, name, {
            title: "Évolution du chiffre d'affaires",
          });
        }
      }, "Chiffre d'affaires");
    },
    [run],
  );

  const exportCategories = useCallback(
    (analytics: AnalyticsResult, format: ExportFormat) => {
      const name = getTimestampedName('ventes-par-categorie', format);

      run(() => {
        if (format === 'csv') {
          exportToCsv(analytics.salesByCategory, CATEGORY_COLUMNS, name);
        } else {
          exportToPdf(analytics.salesByCategory, CATEGORY_COLUMNS, name, {
            title: 'Répartition des ventes par catégorie',
          });
        }
      }, 'Ventes par catégorie');
    },
    [run],
  );

  return { exportDashboard, exportRevenue, exportCategories, isExporting };
}