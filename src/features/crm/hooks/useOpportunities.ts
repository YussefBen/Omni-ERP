import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOpportunity,
  deleteOpportunity,
  fetchOpportunities,
  fetchPipelineStages,
  updateOpportunity,
} from '../services/crmService';
import { publishPipelineEvent } from '../services/pipelineEvents';
import { crmKeys } from './crmKeys';
import type {
  CreateOpportunityPayload,
  Opportunity,
  PipelineStage,
  PipelineStageId,
  UpdateOpportunityPayload,
} from '../types';

/* ---------- Étapes du pipeline ---------- */

interface UsePipelineStagesResult {
  data: PipelineStage[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePipelineStages(): UsePipelineStagesResult {
  const query = useQuery({
    queryKey: crmKeys.pipelineStages(),
    queryFn: fetchPipelineStages,
    staleTime: Infinity,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

/* ---------- Lecture des opportunités ---------- */

interface UseOpportunitiesResult {
  data: Opportunity[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useOpportunities(stageId?: PipelineStageId): UseOpportunitiesResult {
  const query = useQuery({
    queryKey: crmKeys.opportunityList(stageId),
    queryFn: () => fetchOpportunities(stageId),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

/* ---------- Mutations ---------- */

interface MutationContext {
  previous: Array<[readonly unknown[], Opportunity[] | undefined]>;
  fromStage?: PipelineStageId;
}


function patchCachedLists(
  queryClient: ReturnType<typeof useQueryClient>,
  transform: (items: Opportunity[]) => Opportunity[],
): MutationContext {
  const queries = queryClient.getQueriesData<Opportunity[]>({
    queryKey: crmKeys.opportunities(),
  });

  const previous = queries.map(
    ([key, value]) => [key, value] as [readonly unknown[], Opportunity[] | undefined],
  );

  queries.forEach(([key, value]) => {
    if (value) queryClient.setQueryData(key, transform(value));
  });

  return { previous };
}

function restore(
  queryClient: ReturnType<typeof useQueryClient>,
  context?: MutationContext,
) {
  context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
}


export function useUpdateOpportunity() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    Opportunity,
    Error,
    UpdateOpportunityPayload,
    MutationContext
  >({
    mutationFn: updateOpportunity,

       onMutate: async (payload) => {

        await queryClient.cancelQueries({ queryKey: crmKeys.opportunities() });

      const before = queryClient
        .getQueriesData<Opportunity[]>({ queryKey: crmKeys.opportunities() })
        .flatMap(([, items]) => items ?? [])
        .find((item) => item.id === payload.id);

      const context = patchCachedLists(queryClient, (items) =>
        items.map((item) => (item.id === payload.id ? { ...item, ...payload } : item)),
      );

      return { ...context, fromStage: before?.stageId };
    },

    onError: (_error, _payload, context) => restore(queryClient, context),

    onSuccess: (opportunity, payload, context) => {
      if (payload.stageId && payload.stageId !== context?.fromStage) {
        publishPipelineEvent({
          type: 'stage-changed',
          opportunityId: opportunity.id,
          opportunity,
          fromStage: context?.fromStage,
          toStage: payload.stageId,
        });
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: crmKeys.opportunities() });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}


export function useCreateOpportunity() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    Opportunity,
    Error,
    CreateOpportunityPayload,
    MutationContext
  >({
    mutationFn: createOpportunity,

    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: crmKeys.opportunities() });

      const now = new Date().toISOString();
      const draft: Opportunity = {
        ...payload,
        id: -Date.now(),
        createdAt: now,
        updatedAt: now,
      };

      return patchCachedLists(queryClient, (items) => [...items, draft]);
    },

        onError: (_error, _payload, context) => restore(queryClient, context),

    onSuccess: (opportunity) => {
      publishPipelineEvent({
        type: 'created',
        opportunityId: opportunity.id,
        opportunity,
        toStage: opportunity.stageId,
      });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: crmKeys.opportunities() });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();

  const mutation = useMutation<number, Error, number, MutationContext>({
    mutationFn: deleteOpportunity,

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: crmKeys.opportunities() });

      return patchCachedLists(queryClient, (items) =>
        items.filter((item) => item.id !== id),
      );
    },

    onError: (_error, _id, context) => restore(queryClient, context),

    onSuccess: (id) => {
      publishPipelineEvent({
        type: 'deleted',
        opportunityId: id,
      });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: crmKeys.opportunities() });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}