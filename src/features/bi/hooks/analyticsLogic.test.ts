import { describe, it, expect } from 'vitest';
import {
  getForecast,
  getOrdersOverTime,
  getRevenueOverTime,
  getSalesByCategory,
  getSeriesExtremes,
} from './analyticsLogic';
import type { Order, OrderStatus, Product } from '@/features/erp';
import type { TimeSeriesPoint } from '../types';

function makeOrder(
  id: number,
  placedAt: string,
  discountedAmount: number,
  status: OrderStatus = 'livree',
  productId = 1,
): Order {
  return {
    id,
    clientId: 1,
    lines: [
      {
        productId,
        title: `Produit ${productId}`,
        unitPrice: 50,
        quantity: 2,
        total: discountedAmount,
        discountedTotal: discountedAmount,
        thumbnail: '',
      },
    ],
    itemCount: 2,
    totalAmount: discountedAmount,
    discountedAmount,
    status,
    placedAt,
    updatedAt: placedAt,
  };
}

function makeProduct(id: number, category: string): Product {
  return {
    id,
    name: `Produit ${id}`,
    description: '',
    category,
    brand: 'Marque',
    sku: `SKU-${id}`,
    price: 50,
    discountPercentage: 0,
    finalPrice: 50,
    rating: 4,
    stock: 100,
    reorderPoint: 10,
    stockLevel: 'in-stock',
    thumbnail: '',
    weight: 1,
  };
}

describe('getRevenueOverTime', () => {
  it('agrège le chiffre d\'affaires par mois', () => {
    const orders = [
      makeOrder(1, '2026-03-05T10:00:00.000Z', 1000),
      makeOrder(2, '2026-03-20T10:00:00.000Z', 500),
      makeOrder(3, '2026-04-10T10:00:00.000Z', 800),
    ];

    const series = getRevenueOverTime(orders);

    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ key: '2026-03', value: 1500 });
    expect(series[1]).toMatchObject({ key: '2026-04', value: 800 });
  });

  // Un mois sans vente est une information : l'omettre déformerait la
  // courbe et fausserait la pente de la tendance.
  it('conserve à zéro les mois sans commande', () => {
    const orders = [
      makeOrder(1, '2026-03-05T10:00:00.000Z', 1000),
      makeOrder(2, '2026-06-05T10:00:00.000Z', 1000),
    ];

    const series = getRevenueOverTime(orders);

    expect(series.map((point) => point.key)).toEqual([
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
    ]);
    expect(series[1].value).toBe(0);
    expect(series[2].value).toBe(0);
  });

  it('exclut les brouillons et les commandes annulées', () => {
    const orders = [
      makeOrder(1, '2026-03-05T10:00:00.000Z', 1000, 'livree'),
      makeOrder(2, '2026-03-06T10:00:00.000Z', 5000, 'annulee'),
      makeOrder(3, '2026-03-07T10:00:00.000Z', 3000, 'brouillon'),
    ];

    expect(getRevenueOverTime(orders)[0].value).toBe(1000);
  });

  it('ignore les commandes sans date', () => {
    const orders = [makeOrder(1, '', 1000)];
    expect(getRevenueOverTime(orders)).toEqual([]);
  });

  it('renvoie une série vide sans commande', () => {
    expect(getRevenueOverTime([])).toEqual([]);
  });

  it('produit un libellé lisible pour chaque point', () => {
    const series = getRevenueOverTime([makeOrder(1, '2026-03-05T10:00:00.000Z', 100)]);
    expect(series[0].label).toBe('mars 2026');
  });
});

describe('getOrdersOverTime', () => {
  it('compte les commandes par mois plutôt que leur montant', () => {
    const orders = [
      makeOrder(1, '2026-03-05T10:00:00.000Z', 9999),
      makeOrder(2, '2026-03-20T10:00:00.000Z', 1),
    ];

    expect(getOrdersOverTime(orders)[0].value).toBe(2);
  });
});

describe('getSalesByCategory', () => {
  const products = [
    makeProduct(1, 'smartphones'),
    makeProduct(2, 'beauty'),
    makeProduct(3, 'smartphones'),
  ];

  it('regroupe le chiffre d\'affaires par catégorie', () => {
    const orders = [
      makeOrder(1, '2026-03-05T10:00:00.000Z', 1000, 'livree', 1),
      makeOrder(2, '2026-03-06T10:00:00.000Z', 500, 'livree', 3),
      makeOrder(3, '2026-03-07T10:00:00.000Z', 300, 'livree', 2),
    ];

    const shares = getSalesByCategory(orders, products);

    expect(shares[0]).toMatchObject({ category: 'smartphones', value: 1500 });
    expect(shares[1]).toMatchObject({ category: 'beauty', value: 300 });
  });

  it('calcule la part de chaque catégorie', () => {
    const orders = [
      makeOrder(1, '2026-03-05T10:00:00.000Z', 750, 'livree', 1),
      makeOrder(2, '2026-03-06T10:00:00.000Z', 250, 'livree', 2),
    ];

    const shares = getSalesByCategory(orders, products);

    expect(shares[0].share).toBe(75);
    expect(shares[1].share).toBe(25);
  });

  it('trie par chiffre d\'affaires décroissant', () => {
    const orders = [
      makeOrder(1, '2026-03-05T10:00:00.000Z', 100, 'livree', 1),
      makeOrder(2, '2026-03-06T10:00:00.000Z', 900, 'livree', 2),
    ];

    expect(getSalesByCategory(orders, products)[0].category).toBe('beauty');
  });

  // Un produit retiré du catalogue laisse des lignes de commande orphelines :
  // les rattacher à une catégorie explicite vaut mieux que de les perdre.
  it('regroupe les produits absents du catalogue', () => {
    const orders = [makeOrder(1, '2026-03-05T10:00:00.000Z', 500, 'livree', 999)];
    const shares = getSalesByCategory(orders, products);

    expect(shares[0].category).toBe('non-classe');
  });

  it('renvoie une liste vide sans commande facturable', () => {
    const orders = [makeOrder(1, '2026-03-05T10:00:00.000Z', 500, 'annulee', 1)];
    expect(getSalesByCategory(orders, products)).toEqual([]);
  });
});

describe('getForecast', () => {
  function makeSeries(values: number[]): TimeSeriesPoint[] {
    return values.map((value, index) => ({
      key: `2026-${String(index + 1).padStart(2, '0')}`,
      label: `mois ${index + 1}`,
      value,
    }));
  }

  it('prolonge une tendance croissante', () => {
    const forecast = getForecast(makeSeries([100, 200, 300, 400]), 2);

    expect(forecast.points).toHaveLength(2);
    expect(forecast.points[0].value).toBe(500);
    expect(forecast.points[1].value).toBe(600);
    expect(forecast.slope).toBe(100);
    expect(forecast.confidence).toBe(1);
  });

  it('poursuit la numérotation des mois', () => {
    const forecast = getForecast(makeSeries([10, 20, 30, 40]), 2);

    expect(forecast.points[0].key).toBe('2026-05');
    expect(forecast.points[1].key).toBe('2026-06');
  });

  // Une tendance fortement décroissante finirait par prévoir un chiffre
  // d'affaires négatif, ce qui n'a pas de sens.
  it('ne prévoit jamais de valeur négative', () => {
    const forecast = getForecast(makeSeries([1000, 700, 400, 100]), 3);

    expect(forecast.points.every((point) => point.value >= 0)).toBe(true);
  });

  it('expose une confiance faible sur une série erratique', () => {
    const forecast = getForecast(makeSeries([100, 900, 200, 800, 150]), 1);
    expect(forecast.confidence).toBeLessThan(0.3);
  });

  // Sous trois points, une régression n'a aucune valeur statistique :
  // mieux vaut ne rien prévoir que de prévoir n'importe quoi.
  it('ne prévoit rien sur une série trop courte', () => {
    const forecast = getForecast(makeSeries([100, 200]), 3);

    expect(forecast.points).toEqual([]);
    expect(forecast.confidence).toBe(0);
  });
});

describe('getSeriesExtremes', () => {
  it('identifie le meilleur et le pire mois', () => {
    const series = [
      { key: '2026-01', label: 'janvier 2026', value: 500 },
      { key: '2026-02', label: 'février 2026', value: 1500 },
      { key: '2026-03', label: 'mars 2026', value: 900 },
    ];

    const { best, worst } = getSeriesExtremes(series);

    expect(best?.key).toBe('2026-02');
    expect(worst?.key).toBe('2026-01');
  });

  it('renvoie un résultat vide sur une série vide', () => {
    expect(getSeriesExtremes([])).toEqual({});
  });
});