import { describe, it, expect } from 'vitest';
import { getFinalPrice, getStockLevel, toOrder, toProduct, toSupplier } from './erpMappers';
import type {
  DummyJsonCart,
  DummyJsonProduct,
  OrderMeta,
  SupplierRecord,
} from '../types';

function makeRawProduct(overrides: Partial<DummyJsonProduct> = {}): DummyJsonProduct {
  return {
    id: 1,
    title: 'Essence Mascara',
    description: 'Un mascara',
    category: 'beauty',
    brand: 'Essence',
    sku: 'BEA-ESS-001',
    price: 100,
    discountPercentage: 10,
    rating: 4.2,
    stock: 50,
    minimumOrderQuantity: 20,
    availabilityStatus: 'In Stock',
    weight: 4,
    thumbnail: 'https://cdn.exemple.fr/image.webp',
    ...overrides,
  };
}

function makeRawCart(overrides: Partial<DummyJsonCart> = {}): DummyJsonCart {
  return {
    id: 3,
    userId: 7,
    products: [
      {
        id: 101,
        title: 'Produit A',
        price: 50,
        quantity: 2,
        total: 100,
        discountedTotal: 90,
        thumbnail: '',
      },
    ],
    total: 100,
    discountedTotal: 90,
    totalProducts: 1,
    totalQuantity: 2,
    ...overrides,
  };
}

describe('getStockLevel', () => {
  it('signale une rupture à zéro ou moins', () => {
    expect(getStockLevel(0, 10)).toBe('out-of-stock');
    expect(getStockLevel(-2, 10)).toBe('out-of-stock');
  });

  it('signale un stock faible au niveau du seuil ou en dessous', () => {
    expect(getStockLevel(10, 10)).toBe('low-stock');
    expect(getStockLevel(3, 10)).toBe('low-stock');
  });

  it('considère le stock suffisant au-dessus du seuil', () => {
    expect(getStockLevel(11, 10)).toBe('in-stock');
  });

  // Le seuil vaut la quantité minimale de commande fournisseur :
  // il est inclus, car à ce niveau une commande ne peut plus être honorée.
  it('inclut le seuil dans le niveau faible', () => {
    expect(getStockLevel(20, 20)).toBe('low-stock');
    expect(getStockLevel(21, 20)).toBe('in-stock');
  });
});

describe('getFinalPrice', () => {
  it('applique la remise au prix catalogue', () => {
    expect(getFinalPrice(100, 10)).toBe(90);
    expect(getFinalPrice(49.99, 20)).toBe(39.99);
  });

  it('renvoie le prix inchangé sans remise', () => {
    expect(getFinalPrice(100, 0)).toBe(100);
  });

  it('arrondit au centime', () => {
    expect(getFinalPrice(9.99, 10.48)).toBe(8.94);
  });
});

describe('toProduct', () => {
  it('normalise les champs de la réponse brute', () => {
    const product = toProduct(makeRawProduct());

    expect(product.name).toBe('Essence Mascara');
    expect(product.sku).toBe('BEA-ESS-001');
    expect(product.finalPrice).toBe(90);
  });

  it('reprend la quantité minimale de commande comme seuil', () => {
    const product = toProduct(makeRawProduct({ minimumOrderQuantity: 48 }));
    expect(product.reorderPoint).toBe(48);
  });

  it('déduit le niveau de stock du seuil', () => {
    expect(toProduct(makeRawProduct({ stock: 10, minimumOrderQuantity: 20 })).stockLevel)
      .toBe('low-stock');
    expect(toProduct(makeRawProduct({ stock: 0 })).stockLevel).toBe('out-of-stock');
  });

  // Certains produits DummyJSON n'ont pas de marque : afficher "undefined"
  // à l'écran serait un défaut visible.
  it('remplace une marque absente par une valeur explicite', () => {
    const product = toProduct(makeRawProduct({ brand: undefined }));
    expect(product.brand).toBe('Sans marque');
  });
});

describe('toOrder', () => {
  const meta: OrderMeta = {
    id: 1,
    orderId: 3,
    status: 'livree',
    placedAt: '2026-05-10T09:00:00.000Z',
    updatedAt: '2026-05-15T14:00:00.000Z',
  };

  it('joint les lignes distantes aux métadonnées locales', () => {
    const order = toOrder(makeRawCart(), meta);

    expect(order.id).toBe(3);
    expect(order.clientId).toBe(7);
    expect(order.status).toBe('livree');
    expect(order.placedAt).toBe('2026-05-10T09:00:00.000Z');
  });

  it('convertit chaque ligne de commande', () => {
    const order = toOrder(makeRawCart(), meta);

    expect(order.lines).toHaveLength(1);
    expect(order.lines[0]).toMatchObject({
      productId: 101,
      title: 'Produit A',
      unitPrice: 50,
      quantity: 2,
      discountedTotal: 90,
    });
  });

  // Un panier sans métadonnée n'a jamais été confirmé : il existe côté
  // catalogue mais ne constitue pas encore une commande.
  it('considère un panier sans métadonnée comme un brouillon', () => {
    const order = toOrder(makeRawCart());

    expect(order.status).toBe('brouillon');
    expect(order.placedAt).toBe('');
  });
});

describe('toSupplier', () => {
  function makeRecord(scores: number[]): SupplierRecord {
    return {
      id: 1,
      name: 'Fournisseur',
      contactName: 'Contact',
      email: 'contact@exemple.fr',
      phone: '+33 1 00 00 00 00',
      country: 'France',
      categories: ['beauty'],
      leadTimeDays: 10,
      evaluations: scores.map((score, index) => ({
        id: index + 1,
        score,
        comment: '',
        createdAt: '2026-06-01T00:00:00.000Z',
      })),
    };
  }

  it('calcule la moyenne des évaluations', () => {
    const supplier = toSupplier(makeRecord([5, 4, 3]));

    expect(supplier.rating).toBe(4);
    expect(supplier.evaluationCount).toBe(3);
  });

  it('arrondit la moyenne au dixième', () => {
    expect(toSupplier(makeRecord([5, 4])).rating).toBe(4.5);
    expect(toSupplier(makeRecord([5, 4, 4])).rating).toBe(4.3);
  });

  // Une note de zéro sur un fournisseur jamais évalué serait interprétée
  // comme une mauvaise note : evaluationCount permet de distinguer les cas.
  it('renvoie zéro sans évaluation', () => {
    const supplier = toSupplier(makeRecord([]));

    expect(supplier.rating).toBe(0);
    expect(supplier.evaluationCount).toBe(0);
  });

  it('tolère un enregistrement sans tableau d\'évaluations', () => {
    const record = { ...makeRecord([]), evaluations: undefined as never };
    const supplier = toSupplier(record);

    expect(supplier.evaluations).toEqual([]);
    expect(supplier.rating).toBe(0);
  });
});