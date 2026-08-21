// Données de l'écran d'accueil : indicateurs clés des quatre domaines,
// alertes de stock et météo, réunis en un seul point d'entrée.

import { useMemo } from 'react';
import { useKPIs } from '@/features/bi';
import { useLowStockAlerts } from '@/features/erp';
import { useWeather } from './useWeather';
import type { Kpi } from '@/features/bi';
import type { LowStockAlert } from '@/features/erp';
import type { Weather } from '../types';

interface DashboardSummary {
  // Indicateurs mis en avant sur l'accueil, tous domaines confondus.
  highlights: Kpi[];
  // Produits nécessitant un réapprovisionnement, les plus urgents d'abord.
  alerts: LowStockAlert[];
  criticalAlertCount: number;
  weather: Weather | undefined;
}

interface UseDashboardDataResult {
  data: DashboardSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Nombre d'alertes affichées sur l'accueil : au-delà, la liste complète
// se consulte sur l'écran des stocks.
const HOME_ALERTS_LIMIT = 5;

export function useDashboardData(): UseDashboardDataResult {
  const kpis = useKPIs('trois-mois');
  const stockAlerts = useLowStockAlerts();
  const weather = useWeather();

  const data = useMemo<DashboardSummary | undefined>(() => {
    if (!kpis.data) return undefined;

    return {
      // Un indicateur par domaine : le tableau de bord donne une vue
      // d'ensemble, le détail se consulte sur les écrans dédiés.
      highlights: [
        kpis.data.sales.revenue,
        kpis.data.crm.pipelineValue,
        kpis.data.stock.turnoverRate,
        kpis.data.projects.active,
        kpis.data.hr.totalEmployees,
      ],
      alerts: (stockAlerts.data ?? []).slice(0, HOME_ALERTS_LIMIT),
      criticalAlertCount: stockAlerts.criticalCount,
      weather: weather.data,
    };
  }, [kpis.data, stockAlerts.data, stockAlerts.criticalCount, weather.data]);

  return {
    data,
    isLoading: kpis.isLoading || stockAlerts.isLoading,
    // La météo est un agrément : son indisponibilité ne doit pas
    // faire échouer le tableau de bord entier.
    isError: kpis.isError || stockAlerts.isError,
    error: kpis.error ?? stockAlerts.error,
    refetch: () => {
      kpis.refetch();
      stockAlerts.refetch();
      weather.refetch();
    },
  };
}