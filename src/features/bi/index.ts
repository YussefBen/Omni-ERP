// Point d'entrée public du domaine Intelligence d'Affaires.

export { useKPIs } from './hooks/useKPIs';
export { useAnalytics } from './hooks/useAnalytics';
export { useExport } from './hooks/useExport';

export {
  exportToCsv,
  exportToPdf,
  flattenDashboard,
  toCsv,
  KPI_COLUMNS,
  TIME_SERIES_COLUMNS,
  CATEGORY_COLUMNS,
} from './services/exportService';
export type { ExportColumn } from './services/exportService';

export {
  buildKpi,
  getComparisonRange,
  getDeltaPercent,
  getDirection,
  getMonthKey,
  getMonthLabel,
  isFavorable,
  isWithinRange,
  linearRegression,
} from './hooks/kpiLogic';

export {
  buildCrmKpis,
  buildHrKpis,
  buildProjectsKpis,
  buildSalesKpis,
  buildStockKpis,
} from './hooks/kpiBuilders';

export {
  getForecast,
  getOrdersOverTime,
  getRevenueOverTime,
  getSalesByCategory,
  getSeriesExtremes,
} from './hooks/analyticsLogic';

export type * from './types';