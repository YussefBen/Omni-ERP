// Construction des séries temporelles et des prévisions.
// Fonctions pures : elles reçoivent les données chargées, sans appel réseau.

import type { Order, Product } from '@/features/erp';
import { getMonthKey, getMonthLabel, linearRegression } from './kpiLogic';
import type { CategoryShare, Forecast, TimeSeriesPoint } from '../types';

// Seules les commandes réellement honorées comptent dans le chiffre d'affaires.
const BILLABLE_STATUSES = ['confirmee', 'preparation', 'expediee', 'livree'];

function isBillable(order: Order): boolean {
  return BILLABLE_STATUSES.includes(order.status);
}

// Agrège les commandes par mois. Les mois sans commande sont conservés
// à zéro : une série trouée fausserait la tendance et le graphique.
function buildMonthlySeries(
  orders: Order[],
  valueOf: (order: Order) => number,
): TimeSeriesPoint[] {
  const dated = orders.filter((order) => isBillable(order) && order.placedAt);
  if (dated.length === 0) return [];

  const totals = new Map<string, number>();
  for (const order of dated) {
    const key = getMonthKey(order.placedAt);
    totals.set(key, (totals.get(key) ?? 0) + valueOf(order));
  }

  const keys = [...totals.keys()].sort();
  const [firstYear, firstMonth] = keys[0].split('-').map(Number);
  const [lastYear, lastMonth] = keys[keys.length - 1].split('-').map(Number);

  const series: TimeSeriesPoint[] = [];
  const cursor = new Date(firstYear, firstMonth - 1, 1);
  const end = new Date(lastYear, lastMonth - 1, 1);

  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    series.push({
      key,
      label: getMonthLabel(key),
      value: Math.round((totals.get(key) ?? 0) * 100) / 100,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return series;
}

export function getRevenueOverTime(orders: Order[]): TimeSeriesPoint[] {
  return buildMonthlySeries(orders, (order) => order.discountedAmount);
}

export function getOrdersOverTime(orders: Order[]): TimeSeriesPoint[] {
  return buildMonthlySeries(orders, () => 1);
}

// Répartition du chiffre d'affaires par catégorie de produit.
// Le rattachement se fait ligne par ligne via le catalogue.
export function getSalesByCategory(orders: Order[], products: Product[]): CategoryShare[] {
  const categoryOf = new Map(products.map((product) => [product.id, product.category]));
  const totals = new Map<string, number>();

  for (const order of orders) {
    if (!isBillable(order)) continue;
    for (const line of order.lines) {
      const category = categoryOf.get(line.productId) ?? 'non-classe';
      totals.set(category, (totals.get(category) ?? 0) + line.discountedTotal);
    }
  }

  const grandTotal = [...totals.values()].reduce((sum, value) => sum + value, 0);

  return [...totals.entries()]
    .map(([category, value]) => ({
      category,
      value: Math.round(value * 100) / 100,
      share: grandTotal > 0 ? Math.round((value / grandTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

// Prolonge la série par une droite de tendance. Le coefficient de
// détermination est exposé : une prévision sur une série erratique
// doit pouvoir être signalée comme peu fiable à l'utilisateur.
export function getForecast(series: TimeSeriesPoint[], monthsAhead = 3): Forecast {
  if (series.length < 3) {
    return { points: [], slope: 0, confidence: 0 };
  }

  const { slope, intercept, r2 } = linearRegression(series.map((point) => point.value));

  const [lastYear, lastMonth] = series[series.length - 1].key.split('-').map(Number);
  const cursor = new Date(lastYear, lastMonth - 1, 1);

  const points: TimeSeriesPoint[] = [];
  for (let step = 1; step <= monthsAhead; step += 1) {
    cursor.setMonth(cursor.getMonth() + 1);
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    // Une prévision de chiffre d'affaires négatif n'a pas de sens.
    const projected = Math.max(0, slope * (series.length - 1 + step) + intercept);

    points.push({ key, label: getMonthLabel(key), value: Math.round(projected) });
  }

  return { points, slope: Math.round(slope), confidence: r2 };
}

// Meilleur et pire mois de la série, pour commenter la tendance.
export function getSeriesExtremes(series: TimeSeriesPoint[]): {
  best?: TimeSeriesPoint;
  worst?: TimeSeriesPoint;
} {
  if (series.length === 0) return {};

  return {
    best: series.reduce((max, point) => (point.value > max.value ? point : max)),
    worst: series.reduce((min, point) => (point.value < min.value ? point : min)),
  };
}