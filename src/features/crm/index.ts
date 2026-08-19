export { useClients, useClient } from './hooks/useClients';
export {
  usePipelineStages,
  useOpportunities,
  useCreateOpportunity,
  useUpdateOpportunity,
  useDeleteOpportunity,
} from './hooks/useOpportunities';
export { useFeedback, useNps, useCreateFeedback } from './hooks/useFeedback';

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