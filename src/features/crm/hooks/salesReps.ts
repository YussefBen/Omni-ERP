// Commerciaux responsables des opportunités.
// Référentiel local en attendant les employés RH du Membre A : le type UserRef
// étant partagé, le remplacement se fera sans toucher aux composants.

import type { UserRef } from '@/shared/types';
import type { Opportunity } from '../types';

export const SALES_REPS: UserRef[] = [
  { id: 101, name: 'Camille Roussel' },
  { id: 102, name: 'Idriss Benali' },
  { id: 103, name: 'Marta Oliveira' },
  { id: 104, name: 'Thomas Lefèvre' },
];

export function getSalesRepById(id: number): UserRef | undefined {
  return SALES_REPS.find((rep) => rep.id === id);
}

// Répartit les opportunités par commercial, pour un tableau de performance.
export function groupByOwner(
  opportunities: Opportunity[],
): Array<{ owner: UserRef; items: Opportunity[]; total: number }> {
  const buckets = new Map<number, Opportunity[]>();

  for (const opportunity of opportunities) {
    const ownerId = opportunity.owner.id;
    const existing = buckets.get(ownerId);
    if (existing) existing.push(opportunity);
    else buckets.set(ownerId, [opportunity]);
  }

  return [...buckets.entries()]
    .map(([ownerId, items]) => ({
      owner: getSalesRepById(ownerId) ?? items[0].owner,
      items,
      total: items.reduce((sum, item) => sum + item.amount, 0),
    }))
    .sort((a, b) => b.total - a.total);
}

// Charge de travail d'un commercial : opportunités encore ouvertes.
export function getOpenCountByOwner(
  opportunities: Opportunity[],
  ownerId: number,
): number {
  return opportunities.filter(
    (o) => o.owner.id === ownerId && o.stageId !== 'gagnee' && o.stageId !== 'perdue',
  ).length;
}