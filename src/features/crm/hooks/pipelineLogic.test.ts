import { describe, it, expect } from 'vitest';
import {
  canMoveTo,
  getAllowedTransitions,
  getWeightedPipelineValue,
  getWinRate,
  groupByStage,
  isClosedStage,
} from './pipelineLogic';
import type { Opportunity, PipelineStage, PipelineStageId } from '../types';

const STAGES: PipelineStage[] = [
  { id: 'prospection', label: 'Prospection', order: 1, probability: 10 },
  { id: 'qualification', label: 'Qualification', order: 2, probability: 25 },
  { id: 'proposition', label: 'Proposition', order: 3, probability: 50 },
  { id: 'negociation', label: 'Négociation', order: 4, probability: 75 },
  { id: 'gagnee', label: 'Gagnée', order: 5, probability: 100 },
  { id: 'perdue', label: 'Perdue', order: 6, probability: 0 },
];

// Fabrique d'opportunité : seuls les champs utiles au test sont surchargés.
function makeOpportunity(
  id: number,
  stageId: PipelineStageId,
  amount: number,
): Opportunity {
  return {
    id,
    title: `Affaire ${id}`,
    clientId: id,
    stageId,
    amount,
    expectedCloseDate: '2026-12-31',
    owner: { id: 101, name: 'Camille Roussel' },
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-01T09:00:00.000Z',
  };
}

describe('isClosedStage', () => {
  it('considère gagnée et perdue comme terminales', () => {
    expect(isClosedStage('gagnee')).toBe(true);
    expect(isClosedStage('perdue')).toBe(true);
  });

  it('considère les étapes du cycle de vente comme ouvertes', () => {
    expect(isClosedStage('prospection')).toBe(false);
    expect(isClosedStage('negociation')).toBe(false);
  });
});

describe('getAllowedTransitions', () => {
  it('propose l\'étape suivante et les deux issues de clôture', () => {
    expect(getAllowedTransitions('prospection')).toEqual([
      'qualification',
      'gagnee',
      'perdue',
    ]);
  });

  it('ne propose que la clôture depuis la dernière étape du cycle', () => {
    expect(getAllowedTransitions('negociation')).toEqual(['gagnee', 'perdue']);
  });

  it('ne propose plus rien depuis une étape terminale', () => {
    expect(getAllowedTransitions('gagnee')).toEqual([]);
    expect(getAllowedTransitions('perdue')).toEqual([]);
  });
});

describe('canMoveTo', () => {
  it('autorise l\'avancée d\'un cran', () => {
    expect(canMoveTo('qualification', 'proposition')).toBe(true);
  });

  it('autorise la clôture depuis n\'importe quelle étape ouverte', () => {
    expect(canMoveTo('prospection', 'perdue')).toBe(true);
    expect(canMoveTo('proposition', 'gagnee')).toBe(true);
  });

  it('interdit le retour en arrière', () => {
    expect(canMoveTo('negociation', 'proposition')).toBe(false);
  });

  it('interdit de sauter une étape', () => {
    expect(canMoveTo('prospection', 'negociation')).toBe(false);
  });

  it('interdit de rouvrir une affaire close', () => {
    expect(canMoveTo('gagnee', 'negociation')).toBe(false);
    expect(canMoveTo('perdue', 'prospection')).toBe(false);
  });
});

describe('groupByStage', () => {
  const opportunities = [
    makeOpportunity(1, 'negociation', 40000),
    makeOpportunity(2, 'prospection', 10000),
    makeOpportunity(3, 'negociation', 20000),
  ];

  it('respecte l\'ordre d\'affichage des étapes', () => {
    const columns = groupByStage(opportunities, STAGES);
    expect(columns.map((column) => column.stage.id)).toEqual([
      'prospection',
      'qualification',
      'proposition',
      'negociation',
      'gagnee',
      'perdue',
    ]);
  });

  it('additionne les montants de chaque colonne', () => {
    const columns = groupByStage(opportunities, STAGES);
    const negociation = columns.find((column) => column.stage.id === 'negociation');

    expect(negociation?.items).toHaveLength(2);
    expect(negociation?.total).toBe(60000);
  });

  it('conserve les colonnes vides', () => {
    const columns = groupByStage(opportunities, STAGES);
    const qualification = columns.find((column) => column.stage.id === 'qualification');

    expect(qualification?.items).toEqual([]);
    expect(qualification?.total).toBe(0);
  });
});

describe('getWeightedPipelineValue', () => {
  it('pondère chaque montant par la probabilité de son étape', () => {
    const opportunities = [
      makeOpportunity(1, 'negociation', 40000), // 75 % -> 30000
      makeOpportunity(2, 'qualification', 20000), // 25 % -> 5000
    ];

    expect(getWeightedPipelineValue(opportunities, STAGES)).toBe(35000);
  });

  it('exclut les affaires closes du portefeuille', () => {
    const opportunities = [
      makeOpportunity(1, 'gagnee', 100000),
      makeOpportunity(2, 'perdue', 50000),
    ];

    expect(getWeightedPipelineValue(opportunities, STAGES)).toBe(0);
  });

  it('renvoie zéro sur un portefeuille vide', () => {
    expect(getWeightedPipelineValue([], STAGES)).toBe(0);
  });
});

describe('getWinRate', () => {
  it('calcule la part des affaires gagnées parmi les closes', () => {
    const opportunities = [
      makeOpportunity(1, 'gagnee', 1000),
      makeOpportunity(2, 'gagnee', 1000),
      makeOpportunity(3, 'perdue', 1000),
      makeOpportunity(4, 'perdue', 1000),
    ];

    expect(getWinRate(opportunities)).toBe(50);
  });

  it('ignore les affaires encore ouvertes', () => {
    const opportunities = [
      makeOpportunity(1, 'gagnee', 1000),
      makeOpportunity(2, 'negociation', 1000),
      makeOpportunity(3, 'prospection', 1000),
    ];

    expect(getWinRate(opportunities)).toBe(100);
  });

  // Sans affaire close, aucun taux ne peut être calculé :
  // renvoyer zéro évite une division par zéro à l'affichage.
  it('renvoie zéro quand aucune affaire n\'est close', () => {
    expect(getWinRate([makeOpportunity(1, 'negociation', 1000)])).toBe(0);
    expect(getWinRate([])).toBe(0);
  });
});