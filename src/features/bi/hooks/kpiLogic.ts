// Calculs d'indicateurs et comparaisons de période.
// Fonctions pures, testables sans React ni réseau.

import type {
  ComparisonRange,
  DateRange,
  Kpi,
  PeriodPreset,
  TrendDirection,
} from '../types';

/* ---------- Périodes ---------- */

const PRESET_MONTHS: Record<PeriodPreset, number> = {
  'mois-courant': 1,
  'trois-mois': 3,
  'six-mois': 6,
};

function toIso(date: Date): string {
  return date.toISOString();
}

// Période demandée et période précédente de même durée, pour comparer
// des intervalles comparables plutôt qu'un mois contre un trimestre.
export function getComparisonRange(
  preset: PeriodPreset = 'trois-mois',
  reference: Date = new Date(),
): ComparisonRange {
  const months = PRESET_MONTHS[preset];

  const currentTo = new Date(reference);
  const currentFrom = new Date(reference);
  currentFrom.setMonth(currentFrom.getMonth() - months);

  const previousTo = new Date(currentFrom);
  const previousFrom = new Date(currentFrom);
  previousFrom.setMonth(previousFrom.getMonth() - months);

  return {
    current: { from: toIso(currentFrom), to: toIso(currentTo) },
    previous: { from: toIso(previousFrom), to: toIso(previousTo) },
  };
}

export function isWithinRange(isoDate: string, range: DateRange): boolean {
  if (!isoDate) return false;
  return isoDate >= range.from && isoDate <= range.to;
}

/* ---------- Construction d'un indicateur ---------- */

// Sous ce seuil, une variation relève du bruit et non d'une tendance.
const STABLE_THRESHOLD_PERCENT = 2;

export function getDeltaPercent(value: number, previousValue: number): number {
  // Sans base de comparaison, afficher une hausse de 100 % serait trompeur.
  if (previousValue === 0) return value === 0 ? 0 : 100;
  return Math.round(((value - previousValue) / Math.abs(previousValue)) * 100);
}

export function getDirection(deltaPercent: number): TrendDirection {
  if (Math.abs(deltaPercent) < STABLE_THRESHOLD_PERCENT) return 'stable';
  return deltaPercent > 0 ? 'hausse' : 'baisse';
}

export function buildKpi(
  label: string,
  value: number,
  previousValue: number,
  options: Pick<Kpi, 'unit' | 'lowerIsBetter'> = {},
): Kpi {
  const deltaPercent = getDeltaPercent(value, previousValue);

  return {
    label,
    value: Math.round(value * 100) / 100,
    previousValue: Math.round(previousValue * 100) / 100,
    deltaPercent,
    direction: getDirection(deltaPercent),
    ...options,
  };
}

// Une hausse n'est pas toujours une bonne nouvelle : les ruptures de stock
// et les retards s'interprètent à l'envers. Les composants s'appuient
// sur ce calcul plutôt que de refaire la logique de couleur.
export function isFavorable(kpi: Kpi): boolean {
  if (kpi.direction === 'stable') return true;
  const improving = kpi.direction === 'hausse';
  return kpi.lowerIsBetter ? !improving : improving;
}

/* ---------- Séries temporelles ---------- */

const MONTH_LABELS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function getMonthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${MONTH_LABELS[Number(month) - 1]} ${year}`;
}

/* ---------- Régression linéaire ---------- */

// Droite des moindres carrés sur une série de valeurs.
// Renvoie la pente, l'ordonnée à l'origine et le coefficient de détermination.
export function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 };

  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, v) => sum + v, 0) / n;

  let covariance = 0;
  let varianceX = 0;
  for (let i = 0; i < n; i += 1) {
    covariance += (i - meanX) * (values[i] - meanY);
    varianceX += (i - meanX) ** 2;
  }

  const slope = varianceX === 0 ? 0 : covariance / varianceX;
  const intercept = meanY - slope * meanX;

  let residual = 0;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    residual += (values[i] - (slope * i + intercept)) ** 2;
    total += (values[i] - meanY) ** 2;
  }

  const r2 = total === 0 ? 0 : Math.max(0, 1 - residual / total);

  return { slope, intercept, r2: Math.round(r2 * 100) / 100 };
}