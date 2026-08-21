// Point d'entrée public du domaine Intelligence d'Affaires.

export { useKPIs } from './hooks/useKPIs';
export { useAnalytics } from './hooks/useAnalytics';

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