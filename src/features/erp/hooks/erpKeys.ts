// Clés de cache React Query du domaine ERP, centralisées pour que
// les invalidations après mutation ciblent exactement les bonnes requêtes.

import type { OrderFilters, ProductFilters } from '../types';

export const erpKeys = {
  all: ['erp'] as const,

  products: () => [...erpKeys.all, 'products'] as const,
  productList: (filters: ProductFilters) => [...erpKeys.products(), 'list', filters] as const,
  productDetail: (id: number) => [...erpKeys.products(), 'detail', id] as const,
  productCatalog: () => [...erpKeys.products(), 'catalog'] as const,
  productCategories: () => [...erpKeys.products(), 'categories'] as const,

  orders: () => [...erpKeys.all, 'orders'] as const,
  orderList: (filters: OrderFilters) => [...erpKeys.orders(), 'list', filters] as const,
  orderDetail: (id: number) => [...erpKeys.orders(), 'detail', id] as const,

  suppliers: () => [...erpKeys.all, 'suppliers'] as const,
  supplierDetail: (id: number) => [...erpKeys.suppliers(), 'detail', id] as const,

  stockMovements: (productId?: number) =>
    [...erpKeys.all, 'stockMovements', productId ?? 'all'] as const,
};