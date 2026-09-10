import { filter, map, Subject, type Observable } from 'rxjs';
import type { Opportunity, PipelineStageId } from '../types';

export type PipelineEventType = 'stage-changed' | 'created' | 'deleted';

export interface PipelineEvent {
  type: PipelineEventType;
  opportunityId: number;
  opportunity?: Opportunity;
  fromStage?: PipelineStageId;
  toStage?: PipelineStageId;
  occurredAt: string;
}


const pipelineSubject = new Subject<PipelineEvent>();

export function publishPipelineEvent(event: Omit<PipelineEvent, 'occurredAt'>): void {
  pipelineSubject.next({ ...event, occurredAt: new Date().toISOString() });
}

export function getPipelineEvents(): Observable<PipelineEvent> {
  return pipelineSubject.asObservable();
}


export function getStageChanges(): Observable<PipelineEvent> {
  return pipelineSubject.pipe(filter((event) => event.type === 'stage-changed'));
}

export function getEventsForOpportunity(id: number): Observable<PipelineEvent> {
  return pipelineSubject.pipe(filter((event) => event.opportunityId === id));
}

export function getPipelineEventLabels(): Observable<string> {
  return pipelineSubject.pipe(
    map((event) => {
      const title = event.opportunity?.title ?? `Opportunité ${event.opportunityId}`;
      if (event.type === 'created') return `${title} a été créée`;
      if (event.type === 'deleted') return `${title} a été supprimée`;
      return `${title} est passée à l'étape ${event.toStage}`;
    }),
  );
}