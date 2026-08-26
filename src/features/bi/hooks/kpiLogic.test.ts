import { describe, it, expect } from 'vitest';
import {
  buildKpi,
  getComparisonRange,
  getDeltaPercent,
  getDirection,
  getMonthKey,
  getMonthLabel,
  isFavorable,
  isWithinRange,
  linearRegression,
} from './kpiLogic';

describe('getDeltaPercent', () => {
  it('calcule la progression relative', () => {
    expect(getDeltaPercent(120, 100)).toBe(20);
    expect(getDeltaPercent(80, 100)).toBe(-20);
  });

  it('renvoie zéro sans variation', () => {
    expect(getDeltaPercent(100, 100)).toBe(0);
  });

  // Sans base de comparaison, tout écart serait infini : afficher
  // une progression de 100 % reste lisible et ne fausse pas la lecture.
  it('renvoie 100 quand la période précédente était nulle', () => {
    expect(getDeltaPercent(50, 0)).toBe(100);
  });

  it('renvoie zéro quand les deux périodes sont nulles', () => {
    expect(getDeltaPercent(0, 0)).toBe(0);
  });

  // Le taux de marge ou le résultat peuvent être négatifs : la valeur
  // absolue au dénominateur évite un signe inversé sur l'écart.
  it('gère une valeur précédente négative', () => {
    expect(getDeltaPercent(-50, -100)).toBe(50);
  });

  it('arrondit à l\'entier', () => {
    expect(getDeltaPercent(103, 100)).toBe(3);
    expect(getDeltaPercent(1015, 1000)).toBe(2);
  });
});

describe('getDirection', () => {
  it('signale une hausse au-delà du seuil', () => {
    expect(getDirection(10)).toBe('hausse');
  });

  it('signale une baisse au-delà du seuil', () => {
    expect(getDirection(-10)).toBe('baisse');
  });

  // Sans seuil, un indicateur passant de 100 à 101 s'afficherait en hausse
  // et le tableau de bord signalerait du bruit en permanence.
  it('considère les variations inférieures à 2 % comme stables', () => {
    expect(getDirection(1)).toBe('stable');
    expect(getDirection(-1)).toBe('stable');
    expect(getDirection(0)).toBe('stable');
  });

  it('bascule exactement au seuil de 2 %', () => {
    expect(getDirection(1.9)).toBe('stable');
    expect(getDirection(2)).toBe('hausse');
    expect(getDirection(-2)).toBe('baisse');
  });
});

describe('buildKpi', () => {
  it('assemble la valeur, l\'écart et la direction', () => {
    const kpi = buildKpi("Chiffre d'affaires", 12000, 10000, { unit: 'EUR' });

    expect(kpi.label).toBe("Chiffre d'affaires");
    expect(kpi.value).toBe(12000);
    expect(kpi.previousValue).toBe(10000);
    expect(kpi.deltaPercent).toBe(20);
    expect(kpi.direction).toBe('hausse');
    expect(kpi.unit).toBe('EUR');
  });

  it('arrondit les valeurs au centime', () => {
    const kpi = buildKpi('Panier moyen', 123.456, 100.001);

    expect(kpi.value).toBe(123.46);
    expect(kpi.previousValue).toBe(100);
  });

  it('conserve le sens de lecture inversé', () => {
    const kpi = buildKpi('Retards', 3, 5, { lowerIsBetter: true });
    expect(kpi.lowerIsBetter).toBe(true);
  });
});

describe('isFavorable', () => {
  it('considère une hausse comme favorable par défaut', () => {
    expect(isFavorable(buildKpi('CA', 120, 100))).toBe(true);
  });

  it('considère une baisse comme défavorable par défaut', () => {
    expect(isFavorable(buildKpi('CA', 80, 100))).toBe(false);
  });

  // Ruptures de stock, retards, annulations : une baisse est une bonne
  // nouvelle. Sans ce traitement, l'écran colorerait en rouge une amélioration.
  it('inverse la lecture quand une baisse est souhaitable', () => {
    const moinsDeRetards = buildKpi('Retards', 3, 5, { lowerIsBetter: true });
    const plusDeRetards = buildKpi('Retards', 8, 5, { lowerIsBetter: true });

    expect(isFavorable(moinsDeRetards)).toBe(true);
    expect(isFavorable(plusDeRetards)).toBe(false);
  });

  it('considère la stabilité comme favorable', () => {
    expect(isFavorable(buildKpi('Équipes', 9, 9))).toBe(true);
    expect(isFavorable(buildKpi('Retards', 5, 5, { lowerIsBetter: true }))).toBe(true);
  });
});

describe('getComparisonRange', () => {
  const reference = new Date('2026-08-22T12:00:00.000Z');

  it('découpe deux périodes de durée identique', () => {
    const range = getComparisonRange('trois-mois', reference);

    const currentDays =
      (new Date(range.current.to).getTime() - new Date(range.current.from).getTime()) /
      86400000;
    const previousDays =
      (new Date(range.previous.to).getTime() - new Date(range.previous.from).getTime()) /
      86400000;

        // Les mois n'ayant pas tous la même longueur, février à mai ne fait pas
    // exactement autant de jours que mai à août. L'écart reste marginal
    // au regard d'un trimestre, les périodes restent donc comparables.
    expect(Math.abs(currentDays - previousDays)).toBeLessThanOrEqual(5);
  });

  it('fait commencer la période courante là où la précédente s\'arrête', () => {
    const range = getComparisonRange('trois-mois', reference);
    expect(range.previous.to).toBe(range.current.from);
  });

  it('adapte la longueur au préréglage demandé', () => {
    const unMois = getComparisonRange('mois-courant', reference);
    const sixMois = getComparisonRange('six-mois', reference);

    expect(new Date(unMois.current.from).getMonth()).toBe(6); // juillet
    expect(new Date(sixMois.current.from).getMonth()).toBe(1); // février
  });
});

describe('isWithinRange', () => {
  const range = { from: '2026-06-01T00:00:00.000Z', to: '2026-08-31T23:59:59.000Z' };

  it('accepte une date comprise dans l\'intervalle', () => {
    expect(isWithinRange('2026-07-15T10:00:00.000Z', range)).toBe(true);
  });

  it('refuse une date hors de l\'intervalle', () => {
    expect(isWithinRange('2026-05-31T10:00:00.000Z', range)).toBe(false);
    expect(isWithinRange('2026-09-01T10:00:00.000Z', range)).toBe(false);
  });

  // Un panier sans métadonnée locale a une date vide : il ne doit
  // apparaître dans aucune période plutôt que dans toutes.
  it('refuse une date absente', () => {
    expect(isWithinRange('', range)).toBe(false);
  });
});

describe('getMonthKey et getMonthLabel', () => {
  it('extrait la clé mensuelle d\'une date ISO', () => {
    expect(getMonthKey('2026-03-15T10:00:00.000Z')).toBe('2026-03');
  });

  it('produit un libellé lisible en français', () => {
    expect(getMonthLabel('2026-03')).toBe('mars 2026');
    expect(getMonthLabel('2026-12')).toBe('décembre 2026');
  });
});

describe('linearRegression', () => {
  it('trouve la pente exacte d\'une série parfaitement linéaire', () => {
    const result = linearRegression([10, 20, 30, 40]);

    expect(result.slope).toBe(10);
    expect(result.intercept).toBe(10);
    expect(result.r2).toBe(1);
  });

  it('détecte une tendance décroissante', () => {
    expect(linearRegression([100, 80, 60, 40]).slope).toBe(-20);
  });

  // Une série sans variation n'a pas de tendance : le coefficient doit
  // valoir zéro et non un, sans quoi la prévision paraîtrait fiable.
  it('renvoie une confiance nulle sur une série constante', () => {
    const result = linearRegression([50, 50, 50, 50]);

    expect(result.slope).toBe(0);
    expect(result.r2).toBe(0);
  });

  it('donne une confiance faible sur une série erratique', () => {
    const result = linearRegression([10, 90, 20, 80, 15]);
    expect(result.r2).toBeLessThan(0.3);
  });

  it('tolère une série trop courte pour une régression', () => {
    expect(linearRegression([]).slope).toBe(0);
    expect(linearRegression([42]).slope).toBe(0);
    expect(linearRegression([42]).intercept).toBe(42);
  });
});