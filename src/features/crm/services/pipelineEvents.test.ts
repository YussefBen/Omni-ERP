import { describe, it, expect, beforeEach} from 'vitest';
import { firstValueFrom, take, toArray } from 'rxjs';
import {
  getEventsForOpportunity,
  getPipelineEventLabels,
  getPipelineEvents,
  getStageChanges,
  publishPipelineEvent,
  type PipelineEvent,
} from './pipelineEvents';
import type { Opportunity } from '../types';

function makeOpportunity(id: number, title: string): Opportunity {
  return {
    id,
    title,
    clientId: 1,
    stageId: 'negociation',
    amount: 10000,
    expectedCloseDate: '2026-12-31',
    owner: { id: 101, name: 'Camille Roussel' },
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-01T09:00:00.000Z',
  };
}

describe('publishPipelineEvent', () => {
  let recus: PipelineEvent[];
  let unsubscribe: () => void;

  beforeEach(() => {
    recus = [];
    const subscription = getPipelineEvents().subscribe((event) => recus.push(event));
    unsubscribe = () => subscription.unsubscribe();
  });

  it('transmet l\'événement aux abonnés', () => {
    publishPipelineEvent({ type: 'created', opportunityId: 1 });

    expect(recus).toHaveLength(1);
    expect(recus[0].type).toBe('created');
    unsubscribe();
  });

  it('horodate chaque événement à la publication', () => {
    publishPipelineEvent({ type: 'deleted', opportunityId: 5 });

    expect(recus[0].occurredAt).toBeTruthy();
    expect(new Date(recus[0].occurredAt).getTime()).not.toBeNaN();
    unsubscribe();
  });

  it('sert plusieurs abonnés simultanément', () => {
    const second: PipelineEvent[] = [];
    const autre = getPipelineEvents().subscribe((event) => second.push(event));

    publishPipelineEvent({ type: 'created', opportunityId: 2 });

    expect(recus).toHaveLength(1);
    expect(second).toHaveLength(1);

    autre.unsubscribe();
    unsubscribe();
  });

  // Un Subject et non un BehaviorSubject : un abonné tardif ne doit pas
  // recevoir un déplacement déjà traité, ce qui afficherait une notification
  // pour un événement vieux de plusieurs minutes.
  it('ne rejoue pas les événements passés à un nouvel abonné', () => {
    publishPieceAvant();
    const tardif: PipelineEvent[] = [];
    const subscription = getPipelineEvents().subscribe((e) => tardif.push(e));

    expect(tardif).toHaveLength(0);

    subscription.unsubscribe();
    unsubscribe();

    function publishPieceAvant() {
      publishPipelineEvent({ type: 'created', opportunityId: 99 });
    }
  });

  it('cesse de transmettre après désabonnement', () => {
    unsubscribe();
    publishPipelineEvent({ type: 'created', opportunityId: 3 });

    expect(recus).toHaveLength(0);
  });
});

describe('getStageChanges', () => {
  it('ne transmet que les changements d\'étape', () => {
    const recus: PipelineEvent[] = [];
    const subscription = getStageChanges().subscribe((event) => recus.push(event));

    publishPipelineEvent({ type: 'created', opportunityId: 1 });
    publishPipelineEvent({ type: 'stage-changed', opportunityId: 2, toStage: 'gagnee' });
    publishPipelineEvent({ type: 'deleted', opportunityId: 3 });

    expect(recus).toHaveLength(1);
    expect(recus[0].opportunityId).toBe(2);

    subscription.unsubscribe();
  });
});

describe('getEventsForOpportunity', () => {
  it('ne transmet que les événements de l\'opportunité demandée', () => {
    const recus: PipelineEvent[] = [];
    const subscription = getEventsForOpportunity(7).subscribe((e) => recus.push(e));

    publishPipelineEvent({ type: 'created', opportunityId: 7 });
    publishPipelineEvent({ type: 'created', opportunityId: 8 });
    publishPipelineEvent({ type: 'deleted', opportunityId: 7 });

    expect(recus).toHaveLength(2);
    expect(recus.every((e) => e.opportunityId === 7)).toBe(true);

    subscription.unsubscribe();
  });
});

describe('getPipelineEventLabels', () => {
  it('formule un message pour une création', async () => {
    const message = firstValueFrom(getPipelineEventLabels());

    publishPipelineEvent({
      type: 'created',
      opportunityId: 1,
      opportunity: makeOpportunity(1, 'Refonte du portail'),
    });

    expect(await message).toBe('Refonte du portail a été créée');
  });

  it('formule un message pour une suppression', async () => {
    const message = firstValueFrom(getPipelineEventLabels());

    publishPipelineEvent({
      type: 'deleted',
      opportunityId: 2,
      opportunity: makeOpportunity(2, 'Licences analytiques'),
    });

    expect(await message).toBe('Licences analytiques a été supprimée');
  });

  it('formule un message pour un changement d\'étape', async () => {
    const message = firstValueFrom(getPipelineEventLabels());

    publishPipelineEvent({
      type: 'stage-changed',
      opportunityId: 3,
      opportunity: makeOpportunity(3, 'Contrat annuel'),
      toStage: 'gagnee',
    });

    expect(await message).toBe('Contrat annuel est passée à l\'étape gagnee');
  });

  // L'événement de suppression ne porte pas l'opportunité : elle n'existe
  // plus. Le message doit rester lisible malgré tout.
  it('se rabat sur l\'identifiant quand l\'opportunité est absente', async () => {
    const message = firstValueFrom(getPipelineEventLabels());

    publishPipelineEvent({ type: 'deleted', opportunityId: 42 });

    expect(await message).toBe('Opportunité 42 a été supprimée');
  });

  it('transmet les messages dans l\'ordre de publication', async () => {
    const messages = firstValueFrom(getPipelineEventLabels().pipe(take(2), toArray()));

    publishPipelineEvent({
      type: 'created',
      opportunityId: 1,
      opportunity: makeOpportunity(1, 'Première'),
    });
    publishPipelineEvent({
      type: 'deleted',
      opportunityId: 2,
      opportunity: makeOpportunity(2, 'Seconde'),
    });

    expect(await messages).toEqual([
      'Première a été créée',
      'Seconde a été supprimée',
    ]);
  });
});