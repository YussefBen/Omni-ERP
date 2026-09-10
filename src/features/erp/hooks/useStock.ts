// Hooks de gestion des stocks : mouvements, alertes et rotation.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { createStockMovement, fetchStockMovements } from '../services/erpService';
import { erpKeys } from './erpKeys';
import { useProductCatalog } from './useProducts';
import {
  countCriticalAlerts,
  getAlertsValue,
  getLowStockAlerts,
  getStockRotation,
  getTopMovingProducts,
} from './stockLogic';
import type {
  CreateStockMovementPayload,
  LowStockAlert,
  Product,
  StockMovement,
  StockRotation,
} from '../types';

interface UseStockMovementsResult {
  data: StockMovement[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Historique des entrées et sorties, du plus récent au plus ancien.
// Sans identifiant, l'historique porte sur l'ensemble du catalogue.
export function useStockMovements(productId?: number): UseStockMovementsResult {
  const query = useQuery({
    queryKey: erpKeys.stockMovements(productId),
    queryFn: () => fetchStockMovements(productId),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

// Saisie manuelle d'un mouvement : réception fournisseur, casse, inventaire.
// Les mouvements liés aux commandes sont générés par useUpdateOrderStatus.
export function useCreateStockMovement() {
  const queryClient = useQueryClient();

  const mutation = useMutation<StockMovement, Error, CreateStockMovementPayload>({
    mutationFn: createStockMovement,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: erpKeys.stockMovements() });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

interface UseLowStockAlertsResult {
  data: LowStockAlert[] | undefined;
  criticalCount: number;
  totalValue: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Produits sous leur seuil de réapprovisionnement, les plus critiques d'abord.
// Le calcul porte sur tout le catalogue, pas sur la page affichée.
export function useLowStockAlerts(): UseLowStockAlertsResult {
  const { data: products, isLoading, isError, error, refetch } = useProductCatalog();

  const alerts = useMemo(
    () => (products ? getLowStockAlerts(products) : undefined),
    [products],
  );

  return {
    data: alerts,
    criticalCount: alerts ? countCriticalAlerts(alerts) : 0,
    totalValue: alerts ? getAlertsValue(alerts) : 0,
    isLoading,
    isError,
    error,
    refetch,
  };
}

interface UseStockRotationResult {
  data: StockRotation | undefined;
  topMoving: Array<{ product: Product; unitsOut: number }>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

// Taux de rotation du stock. Sert aussi d'indicateur au domaine BI,
// qui importe ce hook plutôt que de refaire le calcul.
export function useStockRotation(productId?: number): UseStockRotationResult {
  const catalog = useProductCatalog();
  const movements = useStockMovements(productId);

  const products = catalog.data;
  const history = movements.data;

  const rotation = useMemo(
    () => (products && history ? getStockRotation(products, history, productId) : undefined),
    [products, history, productId],
  );

  const topMoving = useMemo(
    () => (products && history ? getTopMovingProducts(products, history) : []),
    [products, history],
  );

  return {
    data: rotation,
    topMoving,
    isLoading: catalog.isLoading || movements.isLoading,
    isError: catalog.isError || movements.isError,
    error: catalog.error ?? movements.error,
    refetch: () => {
      catalog.refetch();
      movements.refetch();
    },
  };
}