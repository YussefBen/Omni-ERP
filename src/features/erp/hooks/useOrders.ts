// Hooks des commandes : lecture paginée et changement de statut.
// Un changement de statut génère le mouvement de stock correspondant.

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE } from '@/shared/config/constants';
import {
  createStockMovement,
  fetchOrderById,
  fetchOrders,
  updateOrderStatus,
} from '../services/erpService';
import { erpKeys } from './erpKeys';
import type {
  Order,
  OrderFilters,
  OrderMeta,
  OrderStatus,
  PaginatedOrders,
  UpdateOrderStatusPayload,
} from '../types';

// Transitions autorisées : une commande avance dans le flux et peut être
// annulée tant qu'elle n'est pas expédiée. Une commande livrée est terminale.
const ORDER_FLOW: Record<OrderStatus, OrderStatus[]> = {
  brouillon: ['confirmee', 'annulee'],
  confirmee: ['preparation', 'annulee'],
  preparation: ['expediee', 'annulee'],
  expediee: ['livree'],
  livree: [],
  annulee: [],
};

export function getAllowedOrderTransitions(from: OrderStatus): OrderStatus[] {
  return ORDER_FLOW[from] ?? [];
}

export function canChangeOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return getAllowedOrderTransitions(from).includes(to);
}

interface UseOrdersResult {
  data: PaginatedOrders | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
  totalPages: number;
}

export function useOrders(filters: OrderFilters = {}): UseOrdersResult {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  const appliedFilters: OrderFilters = {
    page,
    pageSize,
    status: filters.status,
    clientId: filters.clientId,
  };

  const query = useQuery({
    queryKey: erpKeys.orderList(appliedFilters),
    queryFn: () => fetchOrders(appliedFilters),
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
    isFetching: query.isFetching,
    totalPages: query.data ? Math.ceil(query.data.total / pageSize) : 0,
  };
}

interface UseOrderResult {
  data: Order | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useOrder(id: number | undefined): UseOrderResult {
  const query = useQuery({
    queryKey: erpKeys.orderDetail(id ?? 0),
    queryFn: () => fetchOrderById(id as number),
    enabled: typeof id === 'number',
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

// Passage d'une commande au statut suivant. Le passage en préparation
// déclenche les sorties de stock correspondantes, une annulation les compense.
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    OrderMeta,
    Error,
    UpdateOrderStatusPayload & { order?: Order }
  >({
    mutationFn: ({ orderId, status }) => updateOrderStatus({ orderId, status }),

    onSuccess: async (_meta, { orderId, status, order }) => {
      if (order) {
        const movements =
          status === 'preparation'
            ? order.lines.map((line) => ({
                productId: line.productId,
                type: 'sortie' as const,
                quantity: line.quantity,
                reason: 'Prélèvement pour commande client',
                orderId,
              }))
            : status === 'annulee'
              ? order.lines.map((line) => ({
                  productId: line.productId,
                  type: 'entree' as const,
                  quantity: line.quantity,
                  reason: 'Annulation de commande, retour en stock',
                  orderId,
                }))
              : [];

        await Promise.all(movements.map(createStockMovement));
      }

      void queryClient.invalidateQueries({ queryKey: erpKeys.orders() });
      void queryClient.invalidateQueries({ queryKey: erpKeys.orderDetail(orderId) });
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