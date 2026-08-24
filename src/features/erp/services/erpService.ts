// Service du domaine ERP : produits et commandes (DummyJSON),
// fournisseurs et mouvements de stock (JSON Server).
// Seul endroit du domaine qui parle HTTP — les hooks n'appellent jamais axios directement.

import axios from 'axios';
import { API_CONFIG } from '@/shared/config/api';
import { DEFAULT_PAGE_SIZE } from '@/shared/config/constants';
import { toOrder, toProduct, toSupplier } from '../hooks/erpMappers';
import { sanitizeText } from '@/shared/utils/sanitize';
import type {
  CreateStockMovementPayload,
  DummyJsonCart,
  DummyJsonList,
  DummyJsonProduct,
  EvaluateSupplierPayload,
  Order,
  OrderFilters,
  OrderMeta,
  PaginatedOrders,
  PaginatedProducts,
  Product,
  ProductFilters,
  StockMovement,
  Supplier,
  SupplierEvaluation,
  SupplierRecord,
  UpdateOrderStatusPayload,
} from '../types';

const catalogApi = axios.create({ baseURL: API_CONFIG.dummyJson, timeout: 10000 });
const localApi = axios.create({ baseURL: API_CONFIG.jsonServer, timeout: 10000 });

// Champs réellement exploités : on écarte reviews, images et meta,
// qui alourdissent la réponse sans servir aux écrans de gestion.
const PRODUCT_FIELDS =
  'title,description,category,brand,sku,price,discountPercentage,rating,stock,minimumOrderQuantity,availabilityStatus,weight,thumbnail';

/* ---------- Produits ---------- */

// Liste paginée. La recherche et le filtre par catégorie passent par des endpoints
// distincts chez DummyJSON : on choisit le plus restrictif des deux.
export async function fetchProducts(
  filters: ProductFilters = {},
): Promise<PaginatedProducts> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const search = filters.search?.trim();

  const path = search
    ? '/products/search'
    : filters.category
      ? `/products/category/${filters.category}`
      : '/products';

  const { data } = await catalogApi.get<DummyJsonList<DummyJsonProduct>>(path, {
    params: {
      limit: pageSize,
      skip: (page - 1) * pageSize,
      select: PRODUCT_FIELDS,
      ...(search ? { q: search } : {}),
    },
  });

  return {
    items: (data.products ?? []).map(toProduct),
    total: data.total,
    page,
    pageSize,
  };
}

export async function fetchProductById(id: number): Promise<Product> {
  const { data } = await catalogApi.get<DummyJsonProduct>(`/products/${id}`, {
    params: { select: PRODUCT_FIELDS },
  });
  return toProduct(data);
}

export async function fetchProductCategories(): Promise<string[]> {
  const { data } = await catalogApi.get<string[]>('/products/category-list');
  return data;
}

// Catalogue complet, sans pagination : nécessaire au calcul des alertes de stock
// et du taux de rotation, qui portent sur l'ensemble du référentiel.
export async function fetchAllProducts(): Promise<Product[]> {
  const { data } = await catalogApi.get<DummyJsonList<DummyJsonProduct>>('/products', {
    params: { limit: 0, select: PRODUCT_FIELDS },
  });
  return (data.products ?? []).map(toProduct);
}

/* ---------- Commandes ---------- */

async function fetchOrderMetaById(): Promise<Map<number, OrderMeta>> {
  const { data } = await localApi.get<OrderMeta[]>('/orders');
  return new Map(data.map((meta) => [meta.orderId, meta]));
}

// Les lignes viennent de DummyJSON, le statut et les dates de db.json.
// Le filtre par statut s'applique après jointure, la source distante l'ignorant.
export async function fetchOrders(filters: OrderFilters = {}): Promise<PaginatedOrders> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

  const [cartsResponse, metaById] = await Promise.all([
    catalogApi.get<DummyJsonList<DummyJsonCart>>('/carts', { params: { limit: 0 } }),
    fetchOrderMetaById(),
  ]);

  let orders = (cartsResponse.data.carts ?? []).map((cart) =>
    toOrder(cart, metaById.get(cart.id)),
  );

  if (filters.clientId) {
    orders = orders.filter((order) => order.clientId === filters.clientId);
  }
  if (filters.status) {
    orders = orders.filter((order) => order.status === filters.status);
  }

  // Les commandes les plus récentes en premier.
  orders.sort((a, b) => b.placedAt.localeCompare(a.placedAt));

  const start = (page - 1) * pageSize;

  return {
    items: orders.slice(start, start + pageSize),
    total: orders.length,
    page,
    pageSize,
  };
}

export async function fetchOrderById(id: number): Promise<Order> {
  const [cartResponse, metaById] = await Promise.all([
    catalogApi.get<DummyJsonCart>(`/carts/${id}`),
    fetchOrderMetaById(),
  ]);
  return toOrder(cartResponse.data, metaById.get(id));
}

// Change le statut d'une commande. Crée la métadonnée si le panier
// n'avait jamais été confirmé.
export async function updateOrderStatus({
  orderId,
  status,
}: UpdateOrderStatusPayload): Promise<OrderMeta> {
  const { data: existing } = await localApi.get<OrderMeta[]>('/orders', {
    params: { orderId },
  });

  const now = new Date().toISOString();

  if (existing.length > 0) {
    const { data } = await localApi.patch<OrderMeta>(`/orders/${existing[0].id}`, {
      status,
      updatedAt: now,
    });
    return data;
  }

  const { data } = await localApi.post<OrderMeta>('/orders', {
    orderId,
    status,
    placedAt: now,
    updatedAt: now,
  });
  return data;
}

/* ---------- Fournisseurs ---------- */

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data } = await localApi.get<SupplierRecord[]>('/suppliers');
  return data.map(toSupplier);
}

export async function fetchSupplierById(id: number): Promise<Supplier> {
  const { data } = await localApi.get<SupplierRecord>(`/suppliers/${id}`);
  return toSupplier(data);
}

// Ajoute une évaluation à un fournisseur. La note moyenne n'est pas écrite :
// elle se recalcule à la lecture depuis la liste des évaluations.
export async function evaluateSupplier({
  supplierId,
  score,
  comment,
}: EvaluateSupplierPayload): Promise<Supplier> {
  const { data: record } = await localApi.get<SupplierRecord>(`/suppliers/${supplierId}`);
  const evaluations = record.evaluations ?? [];

  const evaluation: SupplierEvaluation = {
    id: Math.max(0, ...evaluations.map((e) => e.id)) + 1,
    score,
    // Commentaire libre : nettoyé avant stockage.
    comment: comment ? sanitizeText(comment) : comment,
    createdAt: new Date().toISOString(),
  };

  const { data } = await localApi.patch<SupplierRecord>(`/suppliers/${supplierId}`, {
    evaluations: [...evaluations, evaluation],
  });

  return toSupplier(data);
}

/* ---------- Mouvements de stock ---------- */

export async function fetchStockMovements(productId?: number): Promise<StockMovement[]> {
  const { data } = await localApi.get<StockMovement[]>('/stockMovements', {
    params: productId ? { productId } : undefined,
  });
  return [...data].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export async function createStockMovement(
  payload: CreateStockMovementPayload,
): Promise<StockMovement> {
  const { data } = await localApi.post<StockMovement>('/stockMovements', {
    ...payload,
    reason: sanitizeText(payload.reason),
    occurredAt: new Date().toISOString(),
  });
  return data;
}