import type { Opportunity, PipelineStage, PipelineStageId } from '../types';

const SALES_FLOW: PipelineStageId[] = [
  'prospection',
  'qualification',
  'proposition',
  'negociation',
];

const CLOSED_STAGES: PipelineStageId[] = ['gagnee', 'perdue'];

export function isClosedStage(stageId: PipelineStageId): boolean {
  return CLOSED_STAGES.includes(stageId);
}


export function getAllowedTransitions(from: PipelineStageId): PipelineStageId[] {
  if (isClosedStage(from)) return [];

  const index = SALES_FLOW.indexOf(from);
  const next = SALES_FLOW[index + 1];

  return next ? [next, ...CLOSED_STAGES] : [...CLOSED_STAGES];
}

export function canMoveTo(from: PipelineStageId, to: PipelineStageId): boolean {
  return getAllowedTransitions(from).includes(to);
}

export function groupByStage(
  opportunities: Opportunity[],
  stages: PipelineStage[],
): Array<{ stage: PipelineStage; items: Opportunity[]; total: number }> {
  return [...stages]
    .sort((a, b) => a.order - b.order)
    .map((stage) => {
      const items = opportunities.filter((o) => o.stageId === stage.id);
      return {
        stage,
        items,
        total: items.reduce((sum, o) => sum + o.amount, 0),
      };
    });
}


export function getWeightedPipelineValue(
  opportunities: Opportunity[],
  stages: PipelineStage[],
): number {
  const probabilities = new Map(stages.map((s) => [s.id, s.probability]));

  return Math.round(
    opportunities
      .filter((o) => !isClosedStage(o.stageId))
      .reduce((sum, o) => sum + o.amount * ((probabilities.get(o.stageId) ?? 0) / 100), 0),
  );
}

export function getWinRate(opportunities: Opportunity[]): number {
  const closed = opportunities.filter((o) => isClosedStage(o.stageId));
  if (closed.length === 0) return 0;

  const won = closed.filter((o) => o.stageId === 'gagnee').length;
  return Math.round((won / closed.length) * 100);
}