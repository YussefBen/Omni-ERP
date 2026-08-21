// Tableau de bord d'indicateurs, tous domaines confondus.
// Chaque KPI porte sa valeur courante et celle de la période précédente.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFeedback, useOpportunities, usePipelineStages } from '@/features/crm';
import { useProductCatalog, useStockMovements } from '@/features/erp';
import { fetchOrders } from '@/features/erp/services/erpService';
import { erpKeys } from '@/features/erp/hooks/erpKeys';
import { getComparisonRange } from './kpiLogic';
import {
  buildCrmKpis,
  buildHrKpis,
  buildProjectsKpis,
  buildSalesKpis,
  buildStockKpis,
} from './kpiBuilders';
// Sources temporaires : à remplacer par getProjectsKPI et getHRKPI
// du Membre A dès qu'ils sont livrés. Aucun autre import ne changera.
import { getMockHRKPI, getMockProjectsKPI } from './mockPartnerKpis';
import type { KpiDashboard, PeriodPreset } from '../types';

interface UseKpisResult {
  data: KpiDashboard | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Les commandes sont chargées sans pagination : les indicateurs portent
// sur l'ensemble de la période, pas sur la page affichée à l'écran.
const ALL_ORDERS_FILTERS = { page: 1, pageSize: 1000 };

export function useKPIs(preset: PeriodPreset = 'trois-mois'): UseKpisResult {
  const ordersQuery = useQuery({
    queryKey: erpKeys.orderList(ALL_ORDERS_FILTERS),
    queryFn: () => fetchOrders(ALL_ORDERS_FILTERS),
  });

  const catalog = useProductCatalog();
  const movements = useStockMovements();
  const opportunities = useOpportunities();
  const stages = usePipelineStages();
  const feedback = useFeedback();

  const sources = [ordersQuery, catalog, movements, opportunities, stages, feedback];

  const data = useMemo<KpiDashboard | undefined>(() => {
    if (
      !ordersQuery.data ||
      !catalog.data ||
      !movements.data ||
      !opportunities.data ||
      !stages.data ||
      !feedback.data
    ) {
      return undefined;
    }

    const range = getComparisonRange(preset);

    return {
      sales: buildSalesKpis(ordersQuery.data.items, range.current, range.previous),
      stock: buildStockKpis(catalog.data, movements.data, range.current, range.previous),
      crm: buildCrmKpis(
        opportunities.data,
        stages.data,
        feedback.data,
        range.current,
        range.previous,
      ),
      projects: buildProjectsKpis(getMockProjectsKPI(), getMockProjectsKPI(true)),
      hr: buildHrKpis(getMockHRKPI(), getMockHRKPI(true)),
      range,
    };
  }, [
    ordersQuery.data,
    catalog.data,
    movements.data,
    opportunities.data,
    stages.data,
    feedback.data,
    preset,
  ]);

  return {
    data,
    isLoading: sources.some((source) => source.isLoading),
    isError: sources.some((source) => source.isError),
    error: sources.find((source) => source.error)?.error ?? null,
    refetch: () => sources.forEach((source) => source.refetch()),
  };
}