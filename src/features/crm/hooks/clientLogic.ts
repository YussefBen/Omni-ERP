// Logique de qualification client : segmentation et agrégation des achats.
// Fonctions pures, testables sans React.

import type {
  ClientSegment,
  ClientStatus,
  DummyJsonCart,
  Purchase,
  PurchaseSummary,
} from '../types';

// Seuils de chiffre d'affaires cumulé, en euros, bornes basses incluses.
const SEGMENT_THRESHOLDS: Array<{ min: number; segment: ClientSegment }> = [
  { min: 10000, segment: 'Enterprise' },
  { min: 3000, segment: 'MidMarket' },
  { min: 500, segment: 'Small' },
  { min: 0, segment: 'Individual' },
];

// Le segment se calcule, il ne se saisit pas : deux commerciaux
// regardant le même client doivent aboutir à la même conclusion.
export function getSegment(totalSpent: number): ClientSegment {
  return (
    SEGMENT_THRESHOLDS.find((tier) => totalSpent >= tier.min)?.segment ?? 'Individual'
  );
}

export function toPurchase(cart: DummyJsonCart): Purchase {
  return {
    id: cart.id,
    totalAmount: cart.total,
    discountedAmount: cart.discountedTotal,
    itemCount: cart.totalQuantity,
    products: cart.products.map((line) => ({
      productId: line.id,
      title: line.title,
      price: line.price,
      quantity: line.quantity,
      total: line.total,
      thumbnail: line.thumbnail,
    })),
  };
}

// Le montant retenu est celui réellement facturé, remises déduites.
// L'arrondi n'a lieu qu'à la fin : arrondir à chaque commande ferait
// dériver le total de plusieurs centimes sur un historique fourni.
export function summarizePurchases(carts: DummyJsonCart[]): PurchaseSummary {
  const raw = carts.reduce(
    (acc, cart) => ({
      totalSpent: acc.totalSpent + cart.discountedTotal,
      orderCount: acc.orderCount + 1,
      itemCount: acc.itemCount + cart.totalQuantity,
    }),
    { totalSpent: 0, orderCount: 0, itemCount: 0 },
  );

  return { ...raw, totalSpent: Math.round(raw.totalSpent * 100) / 100 };
}

// Statut par défaut d'un client jamais qualifié manuellement :
// un client sans commande reste un prospect.
export function getDefaultStatus(orderCount: number): ClientStatus {
  return orderCount > 0 ? 'Active' : 'Lead';
}