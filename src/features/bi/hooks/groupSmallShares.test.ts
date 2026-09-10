import { describe, expect, it } from 'vitest';
import { groupSmallShares, OTHER_CATEGORY_LABEL } from './analyticsLogic';
import type { CategoryShare } from '../types';

// Six catégories, triées comme getSalesByCategory les renvoie.
// Total : 1 000 €, 100 %.
const SHARES: CategoryShare[] = [
  { category: 'a', value: 600, share: 60 },
  { category: 'b', value: 300, share: 30 },
  { category: 'c', value: 50, share: 5 },
  { category: 'd', value: 20, share: 2 },
  { category: 'e', value: 15, share: 1.5 },
  { category: 'f', value: 15, share: 1.5 },
];

describe('groupSmallShares', () => {
  it('regroupe les catégories sous 3 % dans une part « Autres », placée en dernier', () => {
    expect(groupSmallShares(SHARES)).toEqual([
      { category: 'a', value: 600, share: 60 },
      { category: 'b', value: 300, share: 30 },
      { category: 'c', value: 50, share: 5 },
      { category: OTHER_CATEGORY_LABEL, value: 50, share: 5 },
    ]);
  });

  it('conserve le total des ventes', () => {
    const total = (shares: CategoryShare[]) =>
      shares.reduce((sum, entry) => sum + entry.value, 0);

    expect(total(groupSmallShares(SHARES))).toBe(total(SHARES));
  });

  it("ne regroupe pas une catégorie isolée sous le seuil", () => {
    const shares = SHARES.slice(0, 4);

    expect(groupSmallShares(shares)).toEqual(shares);
  });

  it('laisse la liste intacte quand toutes les catégories dépassent le seuil', () => {
    const shares = SHARES.slice(0, 3);

    expect(groupSmallShares(shares)).toEqual(shares);
  });

  it('accepte un autre seuil', () => {
    expect(groupSmallShares(SHARES, 10)).toEqual([
      { category: 'a', value: 600, share: 60 },
      { category: 'b', value: 300, share: 30 },
      { category: OTHER_CATEGORY_LABEL, value: 100, share: 10 },
    ]);
  });

  it('renvoie une liste vide sans ventes', () => {
    expect(groupSmallShares([])).toEqual([]);
  });
});