import { describe, it, expect } from 'vitest';
import {
  getDefaultStatus,
  getSegment,
  summarizePurchases,
  toPurchase,
} from './clientLogic';
import type { DummyJsonCart } from '../types';

function makeCart(
  id: number,
  total: number,
  discountedTotal: number,
  totalQuantity: number,
): DummyJsonCart {
  return {
    id,
    userId: 1,
    products: [
      {
        id: 100 + id,
        title: `Produit ${id}`,
        price: 50,
        quantity: totalQuantity,
        total,
        discountedTotal,
        thumbnail: 'https://cdn.exemple.fr/image.webp',
      },
    ],
    total,
    discountedTotal,
    totalProducts: 1,
    totalQuantity,
  };
}

describe('getSegment', () => {
  it('classe les gros comptes en Enterprise', () => {
    expect(getSegment(15000)).toBe('Enterprise');
  });

  it('classe les comptes intermédiaires en MidMarket', () => {
    expect(getSegment(5000)).toBe('MidMarket');
  });

  it('classe les petits comptes en Small', () => {
    expect(getSegment(1200)).toBe('Small');
  });

  it('classe les comptes marginaux en Individual', () => {
    expect(getSegment(100)).toBe('Individual');
    expect(getSegment(0)).toBe('Individual');
  });

  // Les bornes sont incluses : un client à exactement 10 000 € doit
  // basculer dans le segment supérieur, pas rester en dessous.
  it('inclut la borne basse de chaque segment', () => {
    expect(getSegment(10000)).toBe('Enterprise');
    expect(getSegment(9999)).toBe('MidMarket');
    expect(getSegment(3000)).toBe('MidMarket');
    expect(getSegment(2999)).toBe('Small');
    expect(getSegment(500)).toBe('Small');
    expect(getSegment(499)).toBe('Individual');
  });
});

describe('summarizePurchases', () => {
  it('additionne les montants remises déduites', () => {
    const carts = [makeCart(1, 1000, 900, 5), makeCart(2, 500, 450, 3)];
    const summary = summarizePurchases(carts);

    // Le montant retenu est celui réellement facturé, pas le prix catalogue.
    expect(summary.totalSpent).toBe(1350);
    expect(summary.orderCount).toBe(2);
    expect(summary.itemCount).toBe(8);
  });

  it('renvoie un résumé vide sans commande', () => {
    expect(summarizePurchases([])).toEqual({
      totalSpent: 0,
      orderCount: 0,
      itemCount: 0,
    });
  });

  it('arrondit le total au centime', () => {
    const carts = [makeCart(1, 100, 33.333, 1), makeCart(2, 100, 33.333, 1)];
    expect(summarizePurchases(carts).totalSpent).toBe(66.67);
  });
});

describe('getDefaultStatus', () => {
  // Un client qui n'a jamais commandé reste un prospect : ce statut
  // par défaut ne s'applique qu'aux clients jamais qualifiés à la main.
  it('considère un client sans commande comme prospect', () => {
    expect(getDefaultStatus(0)).toBe('Lead');
  });

  it('considère un client ayant commandé comme actif', () => {
    expect(getDefaultStatus(1)).toBe('Active');
    expect(getDefaultStatus(12)).toBe('Active');
  });
});

describe('toPurchase', () => {
  it('convertit un panier en commande normalisée', () => {
    const purchase = toPurchase(makeCart(3, 1000, 850, 4));

    expect(purchase.id).toBe(3);
    expect(purchase.totalAmount).toBe(1000);
    expect(purchase.discountedAmount).toBe(850);
    expect(purchase.itemCount).toBe(4);
  });

  it('convertit chaque ligne de produit', () => {
    const purchase = toPurchase(makeCart(1, 1000, 900, 2));

    expect(purchase.products).toHaveLength(1);
    expect(purchase.products[0]).toMatchObject({
      productId: 101,
      title: 'Produit 1',
      price: 50,
      quantity: 2,
    });
  });
});