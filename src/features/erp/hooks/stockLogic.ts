// Logique de gestion des stocks : alertes de réapprovisionnement et rotation.
// Fonctions pures, testables sans React. getStockRotation() est également
// consommée par le domaine BI : elle ne doit exister qu'ici.

import type {
  LowStockAlert,
  Product,
  StockMovement,
  StockRotation,
} from '../types';

/* ---------- Alertes de réapprovisionnement ---------- */

// Un produit à zéro bloque toute commande : critique.
// Sous le seuil, il reste vendable mais ne peut plus être réapprovisionné
// au minimum fournisseur : faible.
export function getLowStockAlerts(products: Product[]): LowStockAlert[] {
  return products
    .filter((product) => product.stockLevel !== 'in-stock')
    .map((product) => ({
      product,
      severity: product.stock <= 0 ? ('critique' as const) : ('faible' as const),
      // Quantité à commander pour repasser au-dessus du seuil.
      missingQuantity: Math.max(0, product.reorderPoint - product.stock),
    }))
    .sort(
      (a, b) =>
        Number(b.severity === 'critique') - Number(a.severity === 'critique') ||
        b.missingQuantity - a.missingQuantity,
    );
}

export function countCriticalAlerts(alerts: LowStockAlert[]): number {
  return alerts.filter((alert) => alert.severity === 'critique').length;
}

// Valeur immobilisée dans les produits en alerte : sert d'indicateur
// de risque financier sur le tableau de bord.
export function getAlertsValue(alerts: LowStockAlert[]): number {
  return Math.round(
    alerts.reduce(
      (sum, alert) => sum + alert.missingQuantity * alert.product.finalPrice,
      0,
    ),
  );
}

/* ---------- Rotation des stocks ---------- */

// Nombre de jours couverts par l'historique, borné à 1 pour éviter
// une division par zéro sur un historique d'un seul jour.
function getPeriodInDays(movements: StockMovement[]): number {
  if (movements.length === 0) return 1;

  const timestamps = movements.map((m) => new Date(m.occurredAt).getTime());
  const span = Math.max(...timestamps) - Math.min(...timestamps);
  return Math.max(1, Math.round(span / (1000 * 60 * 60 * 24)));
}

// Taux de rotation = quantités sorties / stock moyen.
// Indique combien de fois le stock a été renouvelé sur la période observée.
// Un taux élevé signale un écoulement rapide, un taux bas du capital immobilisé.
export function getStockRotation(
  products: Product[],
  movements: StockMovement[],
  productId?: number,
): StockRotation {
  const scopedMovements = productId
    ? movements.filter((m) => m.productId === productId)
    : movements;

  const scopedProducts = productId
    ? products.filter((p) => p.id === productId)
    : products;

  const unitsOut = scopedMovements
    .filter((m) => m.type === 'sortie')
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalStock = scopedProducts.reduce((sum, p) => sum + p.stock, 0);
  const averageStock = scopedProducts.length > 0 ? totalStock / scopedProducts.length : 0;

  const turnoverRate =
    averageStock > 0 ? Math.round((unitsOut / averageStock) * 100) / 100 : 0;

  const periodInDays = getPeriodInDays(scopedMovements);
  const daysOfInventory =
    turnoverRate > 0 ? Math.round(periodInDays / turnoverRate) : 0;

  return {
    unitsOut,
    averageStock: Math.round(averageStock * 10) / 10,
    turnoverRate,
    daysOfInventory,
  };
}

// Solde net des mouvements d'un produit : entrées moins sorties,
// les ajustements étant comptés en correction négative.
export function getNetMovement(movements: StockMovement[]): number {
  return movements.reduce((sum, movement) => {
    if (movement.type === 'entree') return sum + movement.quantity;
    if (movement.type === 'sortie') return sum - movement.quantity;
    return sum - movement.quantity;
  }, 0);
}

// Produits les plus mouvementés, pour repérer les références qui tournent.
export function getTopMovingProducts(
  products: Product[],
  movements: StockMovement[],
  limit = 5,
): Array<{ product: Product; unitsOut: number }> {
  const outByProduct = new Map<number, number>();

  for (const movement of movements) {
    if (movement.type !== 'sortie') continue;
    outByProduct.set(
      movement.productId,
      (outByProduct.get(movement.productId) ?? 0) + movement.quantity,
    );
  }

  return [...outByProduct.entries()]
    .map(([productId, unitsOut]) => ({
      product: products.find((p) => p.id === productId),
      unitsOut,
    }))
    .filter((entry): entry is { product: Product; unitsOut: number } =>
      Boolean(entry.product),
    )
    .sort((a, b) => b.unitsOut - a.unitsOut)
    .slice(0, limit);
}