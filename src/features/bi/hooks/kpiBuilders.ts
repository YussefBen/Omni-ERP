// Agrégation des indicateurs par domaine. Fonctions pures : elles reçoivent
// les données déjà chargées et n'appellent aucun service.

import type { Feedback, Opportunity, PipelineStage } from '@/features/crm';
import { computeNps, getWeightedPipelineValue, getWinRate } from '@/features/crm';
import type { Order, Product, StockMovement } from '@/features/erp';
import { getLowStockAlerts, getAlertsValue, getStockRotation } from '@/features/erp';
import { buildKpi, isWithinRange } from './kpiLogic';
import type {
  CrmKpiSet,
  DateRange,
  HrKpiRaw,
  HrKpiSet,
  ProjectsKpiRaw,
  ProjectsKpiSet,
  SalesKpiSet,
  StockKpiSet,
} from '../types';

/* ---------- Ventes ---------- */

interface SalesAggregate {
  revenue: number;
  orderCount: number;
  averageBasket: number;
  cancellationRate: number;
}

// Le chiffre d'affaires ne retient que les commandes réellement honorées :
// un brouillon ou une annulation ne génère aucun revenu.
const BILLABLE_STATUSES = ['confirmee', 'preparation', 'expediee', 'livree'];

function aggregateSales(orders: Order[], range: DateRange): SalesAggregate {
  const inRange = orders.filter((order) => isWithinRange(order.placedAt, range));
  const billable = inRange.filter((order) => BILLABLE_STATUSES.includes(order.status));

  const revenue = billable.reduce((sum, order) => sum + order.discountedAmount, 0);
  const cancelled = inRange.filter((order) => order.status === 'annulee').length;

  return {
    revenue,
    orderCount: billable.length,
    averageBasket: billable.length > 0 ? revenue / billable.length : 0,
    cancellationRate: inRange.length > 0 ? (cancelled / inRange.length) * 100 : 0,
  };
}

export function buildSalesKpis(orders: Order[], range: DateRange, previousRange: DateRange): SalesKpiSet {
  const current = aggregateSales(orders, range);
  const previous = aggregateSales(orders, previousRange);

  return {
    revenue: buildKpi("Chiffre d'affaires", current.revenue, previous.revenue, { unit: 'EUR' }),
    orderCount: buildKpi('Commandes', current.orderCount, previous.orderCount, { unit: 'unites' }),
    averageBasket: buildKpi('Panier moyen', current.averageBasket, previous.averageBasket, { unit: 'EUR' }),
    cancellationRate: buildKpi("Taux d'annulation", current.cancellationRate, previous.cancellationRate, {
      unit: 'pourcent',
      lowerIsBetter: true,
    }),
  };
}

/* ---------- Stocks ---------- */

// La rotation est calculée par le domaine ERP : getStockRotation n'existe
// qu'à un seul endroit et sert ici comme sur l'écran des stocks.
export function buildStockKpis(
  products: Product[],
  movements: StockMovement[],
  range: DateRange,
  previousRange: DateRange,
): StockKpiSet {
  const inRange = movements.filter((m) => isWithinRange(m.occurredAt, range));
  const inPreviousRange = movements.filter((m) => isWithinRange(m.occurredAt, previousRange));

  const current = getStockRotation(products, inRange);
  const previous = getStockRotation(products, inPreviousRange);

  const alerts = getLowStockAlerts(products);

  return {
    turnoverRate: buildKpi('Rotation des stocks', current.turnoverRate, previous.turnoverRate),
    daysOfInventory: buildKpi(
      "Durée d'écoulement",
      current.daysOfInventory,
      previous.daysOfInventory,
      { unit: 'jours', lowerIsBetter: true },
    ),
    // L'état des alertes est instantané : il n'existe pas de photo passée
    // du stock, la valeur précédente reprend donc la valeur courante.
    lowStockCount: buildKpi('Produits en alerte', alerts.length, alerts.length, {
      unit: 'unites',
      lowerIsBetter: true,
    }),
    restockValue: buildKpi('Valeur du réassort', getAlertsValue(alerts), getAlertsValue(alerts), {
      unit: 'EUR',
      lowerIsBetter: true,
    }),
  };
}

/* ---------- Relation client ---------- */

export function buildCrmKpis(
  opportunities: Opportunity[],
  stages: PipelineStage[],
  feedback: Feedback[],
  range: DateRange,
  previousRange: DateRange,
): CrmKpiSet {
  const inRange = opportunities.filter((o) => isWithinRange(o.createdAt, range));
  const inPreviousRange = opportunities.filter((o) => isWithinRange(o.createdAt, previousRange));

  const openValue = (items: Opportunity[]) =>
    items
      .filter((o) => o.stageId !== 'gagnee' && o.stageId !== 'perdue')
      .reduce((sum, o) => sum + o.amount, 0);

  const nps = computeNps(feedback);

  return {
    pipelineValue: buildKpi('Pipeline ouvert', openValue(inRange), openValue(inPreviousRange), {
      unit: 'EUR',
    }),
    weightedPipelineValue: buildKpi(
      'Pipeline pondéré',
      getWeightedPipelineValue(inRange, stages),
      getWeightedPipelineValue(inPreviousRange, stages),
      { unit: 'EUR' },
    ),
    winRate: buildKpi('Taux de conversion', getWinRate(inRange), getWinRate(inPreviousRange), {
      unit: 'pourcent',
    }),
    // Le NPS porte sur l'ensemble des avis, sans découpage temporel :
    // JSONPlaceholder ne date pas ses commentaires.
    nps: buildKpi('NPS', nps.score, nps.score),
  };
}

/* ---------- Projets et RH (Membre A) ---------- */

export function buildProjectsKpis(
  current: ProjectsKpiRaw,
  previous: ProjectsKpiRaw,
): ProjectsKpiSet {
  return {
    total: buildKpi('Projets', current.total, previous.total, { unit: 'unites' }),
    active: buildKpi('Projets actifs', current.active, previous.active, { unit: 'unites' }),
    averageProgress: buildKpi('Avancement moyen', current.averageProgress, previous.averageProgress, {
      unit: 'pourcent',
    }),
    overdue: buildKpi('Projets en retard', current.overdue, previous.overdue, {
      unit: 'unites',
      lowerIsBetter: true,
    }),
  };
}

export function buildHrKpis(current: HrKpiRaw, previous: HrKpiRaw): HrKpiSet {
  return {
    totalEmployees: buildKpi('Effectif', current.totalEmployees, previous.totalEmployees, {
      unit: 'unites',
    }),
    teamCount: buildKpi('Équipes', current.teamCount, previous.teamCount, { unit: 'unites' }),
    pendingLeaveRequests: buildKpi(
      'Congés en attente',
      current.pendingLeaveRequests,
      previous.pendingLeaveRequests,
      { unit: 'unites', lowerIsBetter: true },
    ),
    employeesOnLeaveToday: buildKpi(
      "Absents aujourd'hui",
      current.employeesOnLeaveToday,
      previous.employeesOnLeaveToday,
      { unit: 'unites' },
    ),
  };
}