import { describe, it, expect } from 'vitest';
import {
  countCriticalAlerts,
  getAlertsValue,
  getLowStockAlerts,
  getNetMovement,
  getStockRotation,
  getTopMovingProducts,
} from './stockLogic';
import type { Product, StockMovement, StockMovementType } from '../types';

function makeProduct(
  id: number,
  stock: number,
  reorderPoint: number,
  finalPrice = 100,
): Product {
  return {
    id,
    name: `Produit ${id}`,
    description: '',
    category: 'smartphones',
    brand: 'Marque',
    sku: `SKU-${id}`,
    price: finalPrice,
    discountPercentage: 0,
    finalPrice,
    rating: 4,
    stock,
    reorderPoint,
    stockLevel: stock <= 0 ? 'out-of-stock' : stock <= reorderPoint ? 'low-stock' : 'in-stock',
    thumbnail: '',
    weight: 1,
  };
}

function makeMovement(
  id: number,
  productId: number,
  type: StockMovementType,
  quantity: number,
  occurredAt = '2026-06-15T10:00:00.000Z',
): StockMovement {
  return { id, productId, type, quantity, reason: 'Test', occurredAt };
}

describe('getLowStockAlerts', () => {
  it('ignore les produits au-dessus de leur seuil', () => {
    const products = [makeProduct(1, 100, 10), makeProduct(2, 50, 20)];
    expect(getLowStockAlerts(products)).toEqual([]);
  });

  it('signale un produit en rupture comme critique', () => {
    const alerts = getLowStockAlerts([makeProduct(1, 0, 10)]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critique');
  });

  it('signale un produit sous son seuil comme faible', () => {
    const alerts = getLowStockAlerts([makeProduct(1, 5, 10)]);

    expect(alerts[0].severity).toBe('faible');
  });

  it('calcule la quantité à commander pour repasser au-dessus du seuil', () => {
    const alerts = getLowStockAlerts([makeProduct(1, 3, 12)]);
    expect(alerts[0].missingQuantity).toBe(9);
  });

  // Les ruptures bloquent la vente : elles doivent apparaître en premier
  // quelle que soit la quantité manquante.
  it('place les ruptures avant les stocks faibles', () => {
    const products = [
      makeProduct(1, 5, 50), // faible, manque 45
      makeProduct(2, 0, 10), // critique, manque 10
    ];

    const alerts = getLowStockAlerts(products);
    expect(alerts[0].product.id).toBe(2);
    expect(alerts[1].product.id).toBe(1);
  });

  it('trie par quantité manquante à criticité égale', () => {
    const products = [makeProduct(1, 8, 10), makeProduct(2, 2, 20)];
    const alerts = getLowStockAlerts(products);

    expect(alerts[0].missingQuantity).toBe(18);
    expect(alerts[1].missingQuantity).toBe(2);
  });
});

describe('countCriticalAlerts', () => {
  it('ne compte que les ruptures', () => {
    const alerts = getLowStockAlerts([
      makeProduct(1, 0, 10),
      makeProduct(2, 0, 5),
      makeProduct(3, 4, 10),
    ]);

    expect(countCriticalAlerts(alerts)).toBe(2);
  });

  it('renvoie zéro sans alerte', () => {
    expect(countCriticalAlerts([])).toBe(0);
  });
});

describe('getAlertsValue', () => {
  it('valorise le réassort au prix remisé', () => {
    // Manque 8 unités à 25 € et 5 unités à 40 €
    const alerts = getLowStockAlerts([
      makeProduct(1, 2, 10, 25),
      makeProduct(2, 0, 5, 40),
    ]);

    expect(getAlertsValue(alerts)).toBe(400);
  });

  it('renvoie zéro sans alerte', () => {
    expect(getAlertsValue([])).toBe(0);
  });
});

describe('getStockRotation', () => {
  it('calcule le taux depuis les quantités sorties et le stock moyen', () => {
    const products = [makeProduct(1, 100, 10), makeProduct(2, 100, 10)];
    const movements = [
      makeMovement(1, 1, 'sortie', 30),
      makeMovement(2, 2, 'sortie', 20),
      makeMovement(3, 1, 'entree', 500), // les entrées n'entrent pas dans le calcul
    ];

    const rotation = getStockRotation(products, movements);

    expect(rotation.unitsOut).toBe(50);
    expect(rotation.averageStock).toBe(100);
    expect(rotation.turnoverRate).toBe(0.5);
  });

  it('restreint le calcul à un produit lorsqu\'il est précisé', () => {
    const products = [makeProduct(1, 50, 10), makeProduct(2, 200, 10)];
    const movements = [
      makeMovement(1, 1, 'sortie', 25),
      makeMovement(2, 2, 'sortie', 100),
    ];

    const rotation = getStockRotation(products, movements, 1);

    expect(rotation.unitsOut).toBe(25);
    expect(rotation.averageStock).toBe(50);
  });

  // Un catalogue entièrement en rupture donnerait une division par zéro :
  // le taux doit rester à zéro plutôt que de produire Infinity ou NaN.
  it('renvoie zéro quand le stock moyen est nul', () => {
    const rotation = getStockRotation(
      [makeProduct(1, 0, 10)],
      [makeMovement(1, 1, 'sortie', 10)],
    );

    expect(rotation.turnoverRate).toBe(0);
    expect(rotation.daysOfInventory).toBe(0);
  });

  it('renvoie un résultat neutre sans mouvement', () => {
    const rotation = getStockRotation([makeProduct(1, 100, 10)], []);

    expect(rotation.unitsOut).toBe(0);
    expect(rotation.turnoverRate).toBe(0);
  });

  it('calcule la durée d\'écoulement sur la période observée', () => {
    const products = [makeProduct(1, 100, 10)];
    const movements = [
      makeMovement(1, 1, 'sortie', 50, '2026-01-01T00:00:00.000Z'),
      makeMovement(2, 1, 'sortie', 50, '2026-03-02T00:00:00.000Z'),
    ];

    const rotation = getStockRotation(products, movements);

    // 100 unités sorties pour un stock moyen de 100 : rotation de 1
    // sur 60 jours, donc 60 jours d'écoulement.
    expect(rotation.turnoverRate).toBe(1);
    expect(rotation.daysOfInventory).toBe(60);
  });
});

describe('getNetMovement', () => {
  it('additionne les entrées et soustrait les sorties', () => {
    const movements = [
      makeMovement(1, 1, 'entree', 100),
      makeMovement(2, 1, 'sortie', 30),
    ];

    expect(getNetMovement(movements)).toBe(70);
  });

  // Un ajustement d'inventaire constate une perte : casse, vol, erreur
  // de comptage. Il se soustrait comme une sortie.
  it('compte les ajustements en négatif', () => {
    const movements = [
      makeMovement(1, 1, 'entree', 100),
      makeMovement(2, 1, 'ajustement', 5),
    ];

    expect(getNetMovement(movements)).toBe(95);
  });

  it('renvoie zéro sans mouvement', () => {
    expect(getNetMovement([])).toBe(0);
  });
});

describe('getTopMovingProducts', () => {
  const products = [makeProduct(1, 50, 10), makeProduct(2, 50, 10), makeProduct(3, 50, 10)];

  it('classe les produits par quantité sortie décroissante', () => {
    const movements = [
      makeMovement(1, 1, 'sortie', 10),
      makeMovement(2, 2, 'sortie', 40),
      makeMovement(3, 3, 'sortie', 25),
    ];

    const top = getTopMovingProducts(products, movements);

    expect(top.map((entry) => entry.product.id)).toEqual([2, 3, 1]);
    expect(top[0].unitsOut).toBe(40);
  });

  it('cumule plusieurs sorties du même produit', () => {
    const movements = [
      makeMovement(1, 1, 'sortie', 10),
      makeMovement(2, 1, 'sortie', 15),
    ];

    expect(getTopMovingProducts(products, movements)[0].unitsOut).toBe(25);
  });

  it('ignore les entrées et les ajustements', () => {
    const movements = [
      makeMovement(1, 1, 'entree', 500),
      makeMovement(2, 2, 'sortie', 5),
    ];

    const top = getTopMovingProducts(products, movements);

    expect(top).toHaveLength(1);
    expect(top[0].product.id).toBe(2);
  });

  it('respecte la limite demandée', () => {
    const movements = [
      makeMovement(1, 1, 'sortie', 10),
      makeMovement(2, 2, 'sortie', 20),
      makeMovement(3, 3, 'sortie', 30),
    ];

    expect(getTopMovingProducts(products, movements, 2)).toHaveLength(2);
  });

  // Un mouvement peut référencer un produit retiré du catalogue :
  // il doit être ignoré plutôt que de produire une entrée sans produit.
  it('ignore les mouvements dont le produit est absent du catalogue', () => {
    const movements = [makeMovement(1, 999, 'sortie', 10)];
    expect(getTopMovingProducts(products, movements)).toEqual([]);
  });
});