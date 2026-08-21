// Types du domaine Intelligence d'Affaires : indicateurs agrégés,
// comparaisons de période et analyses de tendance.

/* ---------- Indicateur unitaire ---------- */

export type TrendDirection = 'hausse' | 'baisse' | 'stable';

// Indicateur comparé à la période précédente. La grille attend cette
// comparaison sur chaque KPI, pas seulement la valeur courante.
export interface Kpi {
  label: string;
  value: number;
  // Valeur sur la période précédente, pour situer l'évolution.
  previousValue: number;
  // Écart relatif en pourcentage, arrondi à l'entier.
  deltaPercent: number;
  direction: TrendDirection;
  // Unité d'affichage, laissée au composant : euros, jours, pourcentage.
  unit?: 'EUR' | 'jours' | 'pourcent' | 'unites';
  // Vrai lorsqu'une baisse est une bonne nouvelle (ruptures de stock, retards).
  lowerIsBetter?: boolean;
}

/* ---------- Périodes ---------- */

export type PeriodPreset = 'mois-courant' | 'trois-mois' | 'six-mois';

export interface DateRange {
  from: string;
  to: string;
}

// Une période et celle qui la précède immédiatement, de même durée.
export interface ComparisonRange {
  current: DateRange;
  previous: DateRange;
}

/* ---------- Indicateurs par domaine ---------- */

export interface SalesKpiSet {
  revenue: Kpi;
  orderCount: Kpi;
  averageBasket: Kpi;
  cancellationRate: Kpi;
}

export interface StockKpiSet {
  turnoverRate: Kpi;
  daysOfInventory: Kpi;
  lowStockCount: Kpi;
  restockValue: Kpi;
}

export interface CrmKpiSet {
  pipelineValue: Kpi;
  weightedPipelineValue: Kpi;
  winRate: Kpi;
  nps: Kpi;
}

// Fourni par le Membre A. Structure convenue avec l'équipe :
// averageProgress en pourcentage, overdue en nombre de projets.
export interface ProjectsKpiRaw {
  total: number;
  active: number;
  completed: number;
  averageProgress: number;
  overdue: number;
}

// Fourni par le Membre A.
export interface HrKpiRaw {
  totalEmployees: number;
  teamCount: number;
  pendingLeaveRequests: number;
  employeesOnLeaveToday: number;
}

export interface ProjectsKpiSet {
  total: Kpi;
  active: Kpi;
  averageProgress: Kpi;
  overdue: Kpi;
}

export interface HrKpiSet {
  totalEmployees: Kpi;
  teamCount: Kpi;
  pendingLeaveRequests: Kpi;
  employeesOnLeaveToday: Kpi;
}

// Tableau de bord complet, tous domaines confondus.
export interface KpiDashboard {
  sales: SalesKpiSet;
  stock: StockKpiSet;
  crm: CrmKpiSet;
  projects: ProjectsKpiSet;
  hr: HrKpiSet;
  range: ComparisonRange;
}

/* ---------- Analyses ---------- */

// Point d'une série temporelle, exploitable directement par Recharts.
export interface TimeSeriesPoint {
  // Libellé de l'axe : 'mars 2026', 'S12'
  label: string;
  // Clé triable, au format ISO tronqué.
  key: string;
  value: number;
}

export interface CategoryShare {
  category: string;
  value: number;
  // Part du total, en pourcentage.
  share: number;
}

// Prévision issue d'une régression linéaire sur l'historique.
export interface Forecast {
  points: TimeSeriesPoint[];
  // Pente de la droite de tendance, en unités par période.
  slope: number;
  // Qualité de l'ajustement, de 0 à 1.
  confidence: number;
}

export interface AnalyticsResult {
  revenueOverTime: TimeSeriesPoint[];
  ordersOverTime: TimeSeriesPoint[];
  salesByCategory: CategoryShare[];
  revenueForecast: Forecast;
}