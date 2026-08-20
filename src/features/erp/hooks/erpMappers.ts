// Normalisation des données ERP : produits, commandes, fournisseurs.
// Fonctions pures, testables sans React ni réseau.

import type {
  DummyJsonCart,
  DummyJsonProduct,
  Order,
  OrderLine,
  OrderMeta,
  Product,
  StockLevel,
  Supplier,
  SupplierRecord,
} from '../types';

// Sous le seuil de réapprovisionnement, une commande fournisseur
// ne peut plus être honorée : le produit est en alerte.
export function getStockLevel(stock: number, reorderPoint: number): StockLevel {
  if (stock <= 0) return 'out-of-stock';
  return stock <= reorderPoint ? 'low-stock' : 'in-stock';
}

export function getFinalPrice(price: number, discountPercentage: number): number {
  return Math.round(price * (1 - discountPercentage / 100) * 100) / 100;
}

export function toProduct(raw: DummyJsonProduct): Product {
  const reorderPoint = raw.minimumOrderQuantity ?? 0;

  return {
    id: raw.id,
    name: raw.title,
    description: raw.description,
    category: raw.category,
    brand: raw.brand ?? 'Sans marque',
    sku: raw.sku,
    price: raw.price,
    discountPercentage: raw.discountPercentage,
    finalPrice: getFinalPrice(raw.price, raw.discountPercentage),
    rating: raw.rating,
    stock: raw.stock,
    reorderPoint,
    stockLevel: getStockLevel(raw.stock, reorderPoint),
    thumbnail: raw.thumbnail,
    weight: raw.weight,
  };
}

function toOrderLine(line: DummyJsonCart['products'][number]): OrderLine {
  return {
    productId: line.id,
    title: line.title,
    unitPrice: line.price,
    quantity: line.quantity,
    total: line.total,
    discountedTotal: line.discountedTotal,
    thumbnail: line.thumbnail,
  };
}

// Un panier sans métadonnée locale est considéré comme un brouillon :
// il existe côté catalogue mais n'a jamais été confirmé.
export function toOrder(cart: DummyJsonCart, meta?: OrderMeta): Order {
  return {
    id: cart.id,
    clientId: cart.userId,
    lines: cart.products.map(toOrderLine),
    itemCount: cart.totalQuantity,
    totalAmount: cart.total,
    discountedAmount: cart.discountedTotal,
    status: meta?.status ?? 'brouillon',
    placedAt: meta?.placedAt ?? '',
    updatedAt: meta?.updatedAt ?? '',
  };
}

// La note moyenne est recalculée à chaque lecture plutôt que stockée :
// une note figée finirait par diverger de ses évaluations.
export function toSupplier(record: SupplierRecord): Supplier {
  const evaluations = record.evaluations ?? [];
  const count = evaluations.length;
  const rating =
    count === 0
      ? 0
      : Math.round((evaluations.reduce((sum, e) => sum + e.score, 0) / count) * 10) / 10;

  return { ...record, evaluations, rating, evaluationCount: count };
}