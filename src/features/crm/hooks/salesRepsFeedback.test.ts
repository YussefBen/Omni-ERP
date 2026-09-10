import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/test/queryWrapper';
import {
  SALES_REPS,
  getOpenCountByOwner,
  getSalesRepById,
  groupByOwner,
} from './salesReps';
import { useFeedback, useNps } from './useFeedback';
import type { Opportunity, PipelineStageId } from '../types';

const PLACEHOLDER = 'https://jsonplaceholder.typicode.com';

function makeOpportunity(
  id: number,
  ownerId: number,
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
    owner: { id: ownerId, name: `Commercial ${ownerId}` },
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-01T09:00:00.000Z',
  };
}

describe('SALES_REPS', () => {
  it('fournit un référentiel de commerciaux', () => {
    expect(SALES_REPS.length).toBeGreaterThan(0);
    expect(SALES_REPS[0]).toHaveProperty('id');
    expect(SALES_REPS[0]).toHaveProperty('name');
  });

  it('n\'attribue pas deux fois le même identifiant', () => {
    const ids = SALES_REPS.map((rep) => rep.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getSalesRepById', () => {
  it('retrouve un commercial par son identifiant', () => {
    expect(getSalesRepById(101)?.name).toBe('Camille Roussel');
  });

  it('renvoie undefined pour un identifiant inconnu', () => {
    expect(getSalesRepById(999)).toBeUndefined();
  });
});

describe('groupByOwner', () => {
  const opportunites = [
    makeOpportunity(1, 101, 'negociation', 40000),
    makeOpportunity(2, 102, 'proposition', 20000),
    makeOpportunity(3, 101, 'gagnee', 15000),
  ];

  it('regroupe les affaires par commercial', () => {
    const groupes = groupByOwner(opportunites);

    expect(groupes).toHaveLength(2);
    expect(groupes.find((g) => g.owner.id === 101)?.items).toHaveLength(2);
  });

  it('additionne les montants de chaque commercial', () => {
    const groupes = groupByOwner(opportunites);
    expect(groupes.find((g) => g.owner.id === 101)?.total).toBe(55000);
  });

  // Le classement par portefeuille décroissant est ce qu'attend un
  // tableau de performance commerciale.
  it('classe par portefeuille décroissant', () => {
    const groupes = groupByOwner(opportunites);
    expect(groupes[0].owner.id).toBe(101);
  });

  it('renvoie une liste vide sans affaire', () => {
    expect(groupByOwner([])).toEqual([]);
  });

  // Un commercial retiré du référentiel doit rester identifiable :
  // l'affaire porte son nom, on s'en sert plutôt que de perdre le groupe.
  it('conserve les affaires d\'un commercial absent du référentiel', () => {
    const groupes = groupByOwner([makeOpportunity(1, 999, 'negociation', 5000)]);

    expect(groupes).toHaveLength(1);
    expect(groupes[0].owner.name).toBe('Commercial 999');
  });
});

describe('getOpenCountByOwner', () => {
  const opportunites = [
    makeOpportunity(1, 101, 'negociation', 40000),
    makeOpportunity(2, 101, 'gagnee', 15000),
    makeOpportunity(3, 101, 'perdue', 8000),
    makeOpportunity(4, 102, 'proposition', 20000),
  ];

  // La charge de travail ne compte que les affaires encore ouvertes :
  // une affaire close ne demande plus de suivi.
  it('ne compte que les affaires ouvertes', () => {
    expect(getOpenCountByOwner(opportunites, 101)).toBe(1);
  });

  it('renvoie zéro pour un commercial sans affaire ouverte', () => {
    expect(getOpenCountByOwner(opportunites, 999)).toBe(0);
  });
});

describe('useFeedback', () => {
  it('charge les avis clients', async () => {
    const { result } = renderHook(() => useFeedback(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(3);
  });

  it('restreint les avis à un client', async () => {
    const { result } = renderHook(() => useFeedback(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.every((f) => f.clientId === 1)).toBe(true);
  });

  it('normalise les avis en conservant leur auteur', async () => {
    const { result } = renderHook(() => useFeedback(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const premier = result.current.data?.[0];

    expect(premier?.authorEmail).toBe('a@exemple.fr');
    expect(premier?.comment).toBe('Service impeccable');
  });

  it('signale une erreur réseau', async () => {
    server.use(
      http.get(`${PLACEHOLDER}/comments`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useFeedback(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useNps', () => {
  it('calcule le score depuis les avis chargés', async () => {
    const { result } = renderHook(() => useNps(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.total).toBe(3);
    expect(typeof result.current.data?.score).toBe('number');
  });

  it('expose la note moyenne', async () => {
    const { result } = renderHook(() => useNps(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.averageScore).toBeGreaterThan(0);
    expect(result.current.averageScore).toBeLessThanOrEqual(10);
  });

  // La distribution alimente un histogramme : elle doit couvrir les onze
  // notes possibles, y compris celles sans occurrence.
  it('expose une distribution complète', async () => {
    const { result } = renderHook(() => useNps(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.distribution).toHaveLength(11);
  });

  it('restreint le calcul à un client', async () => {
    const { result } = renderHook(() => useNps(1), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.total).toBe(2);
  });

  it('propage une erreur de chargement', async () => {
    server.use(
      http.get(`${PLACEHOLDER}/comments`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useNps(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});