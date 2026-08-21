// Analyses de tendance : évolution du chiffre d'affaires, répartition
// par catégorie et prévisions. Séries prêtes à être passées à Recharts.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProductCatalog } from '@/features/erp';
import { fetchOrders } from '@/features/erp/services/erpService';
import { erpKeys } from '@/features/erp/hooks/erpKeys';
import {
  getForecast,
  getOrdersOverTime,
  getRevenueOverTime,
  getSalesByCategory,
  getSeriesExtremes,
} from './analyticsLogic';
import type { AnalyticsResult, TimeSeriesPoint } from '../types';

interface UseAnalyticsResult {
  data: AnalyticsResult | undefined;
  best: TimeSeriesPoint | undefined;
  worst: TimeSeriesPoint | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Les analyses portent sur tout l'historique, pas sur une page.
const ALL_ORDERS_FILTERS = { page: 1, pageSize: 1000 };

export function useAnalytics(monthsAhead = 3): UseAnalyticsResult {
  const ordersQuery = useQuery({
    queryKey: erpKeys.orderList(ALL_ORDERS_FILTERS),
    queryFn: () => fetchOrders(ALL_ORDERS_FILTERS),
  });

  const catalog = useProductCatalog();

  const data = useMemo<AnalyticsResult | undefined>(() => {
    if (!ordersQuery.data || !catalog.data) return undefined;

    const orders = ordersQuery.data.items;
    const revenueOverTime = getRevenueOverTime(orders);

    return {
      revenueOverTime,
      ordersOverTime: getOrdersOverTime(orders),
      salesByCategory: getSalesByCategory(orders, catalog.data),
      revenueForecast: getForecast(revenueOverTime, monthsAhead),
    };
  }, [ordersQuery.data, catalog.data, monthsAhead]);

  const extremes = useMemo(
    () => (data ? getSeriesExtremes(data.revenueOverTime) : {}),
    [data],
  );

  return {
    data,
    best: extremes.best,
    worst: extremes.worst,
    isLoading: ordersQuery.isLoading || catalog.isLoading,
    isError: ordersQuery.isError || catalog.isError,
    error: ordersQuery.error ?? catalog.error,
    refetch: () => {
      void ordersQuery.refetch();
      catalog.refetch();
    },
  };
}