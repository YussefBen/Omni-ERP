import type { ClientFilters } from '../types';

export const crmKeys = {
  all: ['crm'] as const,

  clients: () => [...crmKeys.all, 'clients'] as const,
  clientList: (filters: ClientFilters) => [...crmKeys.clients(), 'list', filters] as const,
  clientDetail: (id: number) => [...crmKeys.clients(), 'detail', id] as const,

  opportunities: () => [...crmKeys.all, 'opportunities'] as const,
  opportunityList: (stageId?: string) =>
    [...crmKeys.opportunities(), 'list', stageId ?? 'all'] as const,
  opportunityDetail: (id: number) => [...crmKeys.opportunities(), 'detail', id] as const,

  pipelineStages: () => [...crmKeys.all, 'pipelineStages'] as const,

  feedback: (clientId?: number) =>
    [...crmKeys.all, 'feedback', clientId ?? 'all'] as const,
};