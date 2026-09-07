import { describe, it, expect } from 'vitest';
import {
  buildCrmKpis,
  buildHrKpis,
  buildProjectsKpis,
  buildSalesKpis,
  buildStockKpis,
} from './kpiBuilders';
import type { Feedback, Opportunity, PipelineStage, PipelineStageId } from '@/features/crm';
import type { Order, OrderStatus, Product, StockMovement } from '@/features/erp';
import type { DateRange } from '../types';

const COURANTE: DateRange = {
  from: '2026-06-01T00:00:00.000Z',
  to: '2026-08-31T23:59:59.000Z',
};

const PRECEDENTE: DateRange = {
  from: '2026-03-01T00:00:00.000Z',
  to: '2026-05-31T23:59:59.000Z',
};

function makeOrder(
  id: number,
  placedAt: string,
  discountedAmount: number,
  status: OrderStatus = 'livree',
): Order {
  return {
    id,
    clientId: 1,
    lines: [],
    itemCount: 1,
    totalAmount: discountedAmount,
    discountedAmount,
    status,
    placedAt,
    updatedAt: placedAt,
  };
}

function makeProduct(id: number, stock: number, reorderPoint: number): Product {
  return {
    id,
    name: `Produit ${id}`,
    description: '',
    category: 'beauty',
    brand: 'Marque',
    sku: `SKU-${id}`,
    price: 100,
    discountPercentage: 0,
    finalPrice: 100,
    rating: 4,
    stock,
    reorderPoint,
    stockLevel:
      stock <= 0 ? 'out-of-stock' : stock <= reorderPoint ? 'low-stock' : 'in-stock',
    thumbnail: '',
    weight: 1,
  };
}

function makeMovement(id: number, occurredAt: string, quantity: number): StockMovement {
  return {
    id,
    productId: 1,
    type: 'sortie',
    quantity,
    reason: 'Test',
    occurredAt,
  };
}

function makeOpportunity(
  id: number,
  createdAt: string,
  stageId: PipelineStageId,
  amount: number,
): Opportunity {
  return {
    id,
    title: `Affaire ${id}`,
    clientId: 1,
    stageId,
    amount,
    expectedCloseDate: '2026-12-31',
    owner: { id: 101, name: 'Camille Roussel' },
    createdAt,
    updatedAt: createdAt,
  };
}

const STAGES: PipelineStage[] = [
  { id: 'prospection', label: 'Prospection', order: 1, probability: 10 },
  { id: 'qualification', label: 'Qualification', order: 2, probability: 25 },
  { id: 'proposition', label: 'Proposition', order: 3, probability: 50 },
  { id: 'negociation', label: 'Négociation', order: 4, probability: 75 },
  { id: 'gagnee', label: 'Gagnée', order: 5, probability: 100 },
  { id: 'perdue', label: 'Perdue', order: 6, probability: 0 },
];

describe('buildSalesKpis', () => {
  const commandes = [
    makeOrder(1, '2026-07-10T10:00:00.000Z', 1000),
    makeOrder(2, '2026-07-20T10:00:00.000Z', 3000),
    makeOrder(3, '2026-04-15T10:00:00.000Z', 2000),
  ];

  it('additionne le chiffre d\'affaires de la période', () => {
    const kpis = buildSalesKpis(commandes, COURANTE, PRECEDENTE);

    expect(kpis.revenue.value).toBe(4000);
    expect(kpis.revenue.previousValue).toBe(2000);
    expect(kpis.revenue.deltaPercent).toBe(100);
  });

  it('compte les commandes facturables', () => {
    const kpis = buildSalesKpis(commandes, COURANTE, PRECEDENTE);
    expect(kpis.orderCount.value).toBe(2);
  });

  // Un panier abandonné ou une commande annulée ne génère aucun revenu :
  // les compter fausserait le chiffre d'affaires.
  it('exclut les brouillons et les annulations du chiffre d\'affaires', () => {
    const avecRebut = [
      ...commandes,
      makeOrder(4, '2026-07-25T10:00:00.000Z', 9999, 'brouillon'),
      makeOrder(5, '2026-07-26T10:00:00.000Z', 5000, 'annulee'),
    ];

    expect(buildSalesKpis(avecRebut, COURANTE, PRECEDENTE).revenue.value).toBe(4000);
  });

  it('calcule le panier moyen', () => {
    const kpis = buildSalesKpis(commandes, COURANTE, PRECEDENTE);
    expect(kpis.averageBasket.value).toBe(2000);
  });

  it('calcule le taux d\'annulation sur l\'ensemble des commandes', () => {
    const avecAnnulation = [
      makeOrder(1, '2026-07-10T10:00:00.000Z', 1000),
      makeOrder(2, '2026-07-11T10:00:00.000Z', 1000, 'annulee'),
    ];

    const kpis = buildSalesKpis(avecAnnulation, COURANTE, PRECEDENTE);
    expect(kpis.cancellationRate.value).toBe(50);
  });

  // Un taux d'annulation qui baisse est une bonne nouvelle : le drapeau
  // permet à l'écran de colorer correctement sans refaire la règle.
  it('marque le taux d\'annulation comme meilleur à la baisse', () => {
    const kpis = buildSalesKpis(commandes, COURANTE, PRECEDENTE);
    expect(kpis.cancellationRate.lowerIsBetter).toBe(true);
  });

  it('renvoie des indicateurs neutres sans commande', () => {
    const kpis = buildSalesKpis([], COURANTE, PRECEDENTE);

    expect(kpis.revenue.value).toBe(0);
    expect(kpis.averageBasket.value).toBe(0);
    expect(kpis.cancellationRate.value).toBe(0);
  });
});

describe('buildStockKpis', () => {
  const produits = [makeProduct(1, 100, 10), makeProduct(2, 5, 20)];
  const mouvements = [
    makeMovement(1, '2026-07-10T10:00:00.000Z', 30),
    makeMovement(2, '2026-04-10T10:00:00.000Z', 10),
  ];

  it('calcule la rotation sur la période', () => {
    const kpis = buildStockKpis(produits, mouvements, COURANTE, PRECEDENTE);

    expect(kpis.turnoverRate.value).toBeGreaterThan(0);
    expect(kpis.turnoverRate.previousValue).toBeGreaterThan(0);
  });

  it('compte les produits en alerte', () => {
    const kpis = buildStockKpis(produits, mouvements, COURANTE, PRECEDENTE);
    expect(kpis.lowStockCount.value).toBe(1);
  });

  it('valorise le réassort nécessaire', () => {
    const kpis = buildStockKpis(produits, mouvements, COURANTE, PRECEDENTE);
    // 15 unités manquantes à 100 €
    expect(kpis.restockValue.value).toBe(1500);
  });

  // Il n'existe pas de photographie passée du stock : la comparaison
  // n'a pas de sens sur ces deux indicateurs, on l'assume plutôt que
  // de fabriquer une valeur précédente.
  it('n\'affiche aucune variation sur les indicateurs instantanés', () => {
    const kpis = buildStockKpis(produits, mouvements, COURANTE, PRECEDENTE);

    expect(kpis.lowStockCount.deltaPercent).toBe(0);
    expect(kpis.restockValue.deltaPercent).toBe(0);
  });

  it('marque la durée d\'écoulement comme meilleure à la baisse', () => {
    const kpis = buildStockKpis(produits, mouvements, COURANTE, PRECEDENTE);
    expect(kpis.daysOfInventory.lowerIsBetter).toBe(true);
  });
});

describe('buildCrmKpis', () => {
  const opportunites = [
    makeOpportunity(1, '2026-07-01T10:00:00.000Z', 'negociation', 40000),
    makeOpportunity(2, '2026-07-05T10:00:00.000Z', 'gagnee', 20000),
    makeOpportunity(3, '2026-04-01T10:00:00.000Z', 'proposition', 10000),
  ];

  const avis: Feedback[] = [
    { id: 1, clientId: 1, score: 10, authorName: 'A', authorEmail: 'a@x.fr' },
    { id: 2, clientId: 2, score: 3, authorName: 'B', authorEmail: 'b@x.fr' },
  ];

  it('valorise le pipeline ouvert de la période', () => {
    const kpis = buildCrmKpis(opportunites, STAGES, avis, COURANTE, PRECEDENTE);

    // Seule l'affaire en négociation est ouverte sur la période courante
    expect(kpis.pipelineValue.value).toBe(40000);
    expect(kpis.pipelineValue.previousValue).toBe(10000);
  });

  it('pondère le pipeline par les probabilités d\'étape', () => {
    const kpis = buildCrmKpis(opportunites, STAGES, avis, COURANTE, PRECEDENTE);
    // 40000 à 75 %
    expect(kpis.weightedPipelineValue.value).toBe(30000);
  });

  it('calcule le taux de conversion', () => {
    const kpis = buildCrmKpis(opportunites, STAGES, avis, COURANTE, PRECEDENTE);
    expect(kpis.winRate.value).toBe(100);
  });

  // JSONPlaceholder ne date pas ses commentaires : le NPS porte sur
  // l'ensemble des avis, sans découpage temporel possible.
  it('calcule le NPS sur l\'ensemble des avis', () => {
    const kpis = buildCrmKpis(opportunites, STAGES, avis, COURANTE, PRECEDENTE);

    expect(kpis.nps.value).toBe(0);
    expect(kpis.nps.deltaPercent).toBe(0);
  });
});

describe('buildProjectsKpis', () => {
  const courant = { total: 24, active: 11, completed: 9, averageProgress: 63, overdue: 3 };
  const precedent = { total: 21, active: 12, completed: 6, averageProgress: 58, overdue: 5 };

  it('compare chaque indicateur à la période précédente', () => {
    const kpis = buildProjectsKpis(courant, precedent);

    expect(kpis.total.value).toBe(24);
    expect(kpis.total.previousValue).toBe(21);
    expect(kpis.total.direction).toBe('hausse');
  });

  it('exprime l\'avancement en pourcentage', () => {
    const kpis = buildProjectsKpis(courant, precedent);
    expect(kpis.averageProgress.unit).toBe('pourcent');
  });

  // Moins de retards est une bonne nouvelle, même si la valeur baisse.
  it('marque les retards comme meilleurs à la baisse', () => {
    const kpis = buildProjectsKpis(courant, precedent);

    expect(kpis.overdue.lowerIsBetter).toBe(true);
    expect(kpis.overdue.direction).toBe('baisse');
  });
});

describe('buildHrKpis', () => {
  const courant = {
    totalEmployees: 87,
    teamCount: 9,
    pendingLeaveRequests: 12,
    employeesOnLeaveToday: 6,
  };
  const precedent = {
    totalEmployees: 84,
    teamCount: 9,
    pendingLeaveRequests: 17,
    employeesOnLeaveToday: 4,
  };

  it('compare l\'effectif', () => {
    const kpis = buildHrKpis(courant, precedent);

    expect(kpis.totalEmployees.value).toBe(87);
    expect(kpis.totalEmployees.direction).toBe('hausse');
  });

  it('signale la stabilité du nombre d\'équipes', () => {
    const kpis = buildHrKpis(courant, precedent);
    expect(kpis.teamCount.direction).toBe('stable');
  });

  it('marque les congés en attente comme meilleurs à la baisse', () => {
    const kpis = buildHrKpis(courant, precedent);
    expect(kpis.pendingLeaveRequests.lowerIsBetter).toBe(true);
  });
});