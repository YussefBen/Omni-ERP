import { describe, it, expect } from 'vitest';
import {
  computeNps,
  getAverageScore,
  getNpsCategory,
  getScoreDistribution,
} from './npsLogic';
import type { Feedback } from '../types';

function makeFeedback(id: number, score: number): Feedback {
  return {
    id,
    clientId: id,
    score,
    comment: `Avis ${id}`,
    authorName: `Auteur ${id}`,
    authorEmail: `auteur${id}@exemple.fr`,
  };
}

function makeFeedbackList(scores: number[]): Feedback[] {
  return scores.map((score, index) => makeFeedback(index + 1, score));
}

describe('getNpsCategory', () => {
  it('classe 9 et 10 en promoteurs', () => {
    expect(getNpsCategory(9)).toBe('promoteur');
    expect(getNpsCategory(10)).toBe('promoteur');
  });

  it('classe 7 et 8 en passifs', () => {
    expect(getNpsCategory(7)).toBe('passif');
    expect(getNpsCategory(8)).toBe('passif');
  });

  it('classe 0 à 6 en détracteurs', () => {
    expect(getNpsCategory(0)).toBe('detracteur');
    expect(getNpsCategory(6)).toBe('detracteur');
  });

  // Les bornes 6/7 et 8/9 sont les seules où une erreur de comparaison
  // fausserait le score sans être visible sur un jeu de données moyen.
  it('place correctement les valeurs frontières', () => {
    expect(getNpsCategory(6)).toBe('detracteur');
    expect(getNpsCategory(7)).toBe('passif');
    expect(getNpsCategory(8)).toBe('passif');
    expect(getNpsCategory(9)).toBe('promoteur');
  });
});

describe('computeNps', () => {
  it('soustrait le pourcentage de détracteurs à celui des promoteurs', () => {
    // 5 promoteurs, 2 passifs, 3 détracteurs sur 10 : 50 % - 30 % = 20
    const feedback = makeFeedbackList([10, 10, 9, 9, 9, 7, 8, 3, 5, 6]);
    const result = computeNps(feedback);

    expect(result.promoters).toBe(5);
    expect(result.passives).toBe(2);
    expect(result.detractors).toBe(3);
    expect(result.total).toBe(10);
    expect(result.score).toBe(20);
  });

  it('ignore les passifs dans le calcul du score', () => {
    // Sans passif : 50 % - 50 % = 0
    const sansPassifs = computeNps(makeFeedbackList([10, 10, 3, 3]));
    // Avec deux passifs ajoutés, les proportions changent donc le score aussi,
    // mais les passifs eux-mêmes n'entrent jamais dans la soustraction.
    const avecPassifs = computeNps(makeFeedbackList([10, 10, 3, 3, 7, 8]));

    expect(sansPassifs.score).toBe(0);
    expect(avecPassifs.passives).toBe(2);
    expect(avecPassifs.score).toBe(0);
  });

  it('renvoie 100 quand tous les avis sont des promoteurs', () => {
    expect(computeNps(makeFeedbackList([9, 10, 10])).score).toBe(100);
  });

  it('renvoie -100 quand tous les avis sont des détracteurs', () => {
    expect(computeNps(makeFeedbackList([0, 3, 6])).score).toBe(-100);
  });

  // Sans avis, aucun score ne peut être calculé : renvoyer zéro évite
  // une division par zéro et un affichage NaN.
  it('renvoie un résultat neutre sur une liste vide', () => {
    const result = computeNps([]);

    expect(result).toEqual({
      score: 0,
      detractors: 0,
      passives: 0,
      promoters: 0,
      total: 0,
    });
  });

  it('arrondit le score à l\'entier', () => {
    // 1 promoteur sur 3 : 33,33 % - 0 % arrondi à 33
    expect(computeNps(makeFeedbackList([10, 7, 8])).score).toBe(33);
  });
});

describe('getAverageScore', () => {
  it('calcule la moyenne arrondie au dixième', () => {
    expect(getAverageScore(makeFeedbackList([8, 9, 10]))).toBe(9);
    expect(getAverageScore(makeFeedbackList([7, 8, 10]))).toBe(8.3);
  });

  it('renvoie zéro sur une liste vide', () => {
    expect(getAverageScore([])).toBe(0);
  });
});

describe('getScoreDistribution', () => {
  it('renvoie toujours les onze notes possibles', () => {
    const distribution = getScoreDistribution(makeFeedbackList([5, 5, 9]));

    expect(distribution).toHaveLength(11);
    expect(distribution.map((entry) => entry.score)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it('compte les occurrences de chaque note', () => {
    const distribution = getScoreDistribution(makeFeedbackList([5, 5, 9]));

    expect(distribution[5].count).toBe(2);
    expect(distribution[9].count).toBe(1);
  });

  // Les notes sans occurrence restent à zéro plutôt que d'être omises :
  // un histogramme troué serait illisible.
  it('conserve les notes sans occurrence', () => {
    const distribution = getScoreDistribution(makeFeedbackList([5]));

    expect(distribution[0].count).toBe(0);
    expect(distribution[10].count).toBe(0);
  });

  it('ignore les notes hors de l\'échelle', () => {
    const distribution = getScoreDistribution([
      makeFeedback(1, 15),
      makeFeedback(2, -3),
      makeFeedback(3, 7),
    ]);

    const total = distribution.reduce((sum, entry) => sum + entry.count, 0);
    expect(total).toBe(1);
  });
});