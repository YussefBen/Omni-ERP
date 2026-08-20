export { useClients, useClient, useUpdateClientStatus } from './hooks/useClients';
export { getSegment, getDefaultStatus, summarizePurchases } from './hooks/clientLogic';
export {
  usePipelineStages,
  useOpportunities,
  useCreateOpportunity,
  useUpdateOpportunity,
  useDeleteOpportunity,
} from './hooks/useOpportunities';
export { useFeedback, useNps } from './hooks/useFeedback';
export { deriveScore, toFeedback } from './hooks/feedbackMapper';
export { usePipelineObserver } from './hooks/usePipelineObserver';
export {
  getPipelineEvents,
  getStageChanges,
  getEventsForOpportunity,
  publishPipelineEvent,
} from './services/pipelineEvents';
export type { PipelineEvent, PipelineEventType } from './services/pipelineEvents';

export {
  canMoveTo,
  getAllowedTransitions,
  getWeightedPipelineValue,
  getWinRate,
  groupByStage,
  isClosedStage,
} from './hooks/pipelineLogic';
export { computeNps, getAverageScore, getNpsCategory, getScoreDistribution } from './hooks/npsLogic';

export type * from './types';