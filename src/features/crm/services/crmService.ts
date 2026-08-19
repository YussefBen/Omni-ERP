import axios from 'axios';
import { API_CONFIG } from '@/shared/config/api';
import { DEFAULT_PAGE_SIZE } from '@/shared/config/constants';
import type {
  Client,
  ClientFilters,
  CreateOpportunityPayload,
  DummyJsonList,
  DummyJsonUser,
  Feedback,
  Opportunity,
  PaginatedClients,
  PipelineStage,
  UpdateOpportunityPayload,
} from '../types';

const clientsApi = axios.create({ baseURL: API_CONFIG.dummyJson, timeout: 10000 });
const localApi = axios.create({ baseURL: API_CONFIG.jsonServer, timeout: 10000 });

// Champs réellement exploités par le CRM : on ignore le reste de la réponse DummyJSON,
// qui contient des données sensibles (mot de passe, coordonnées bancaires, SSN).
const CLIENT_FIELDS = 'firstName,lastName,email,phone,image,company,address,role';

/* ---------- Clients ---------- */

// Convertit la réponse brute de DummyJSON en client normalisé.
function toClient(user: DummyJsonUser): Client {
  return {
    id: user.id,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.image,
    companyName: user.company?.name ?? '',
    jobTitle: user.company?.title ?? '',
    department: user.company?.department ?? '',
    city: user.address?.city ?? '',
    country: user.address?.country ?? '',
  };
}

// Liste paginée des clients. Un terme de recherche bascule sur l'endpoint dédié,
// la recherche restant faite côté serveur pour ne pas charger toute la base.
export async function fetchClients(filters: ClientFilters = {}): Promise<PaginatedClients> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const search = filters.search?.trim();

  const path = search ? '/users/search' : '/users';
  const { data } = await clientsApi.get<DummyJsonList<DummyJsonUser>>(path, {
    params: {
      limit: pageSize,
      skip: (page - 1) * pageSize,
      select: CLIENT_FIELDS,
      ...(search ? { q: search } : {}),
    },
  });

  return {
    items: (data.users ?? []).map(toClient),
    total: data.total,
    page,
    pageSize,
  };
}

export async function fetchClientById(id: number): Promise<Client> {
  const { data } = await clientsApi.get<DummyJsonUser>(`/users/${id}`, {
    params: { select: CLIENT_FIELDS },
  });
  return toClient(data);
}

/* ---------- Pipeline de vente ---------- */

export async function fetchPipelineStages(): Promise<PipelineStage[]> {
  const { data } = await localApi.get<PipelineStage[]>('/pipelineStages');
  // L'ordre d'affichage du kanban ne dépend pas de l'ordre de stockage.
  return [...data].sort((a, b) => a.order - b.order);
}

export async function fetchOpportunities(stageId?: string): Promise<Opportunity[]> {
  const { data } = await localApi.get<Opportunity[]>('/opportunities', {
    params: stageId ? { stageId } : undefined,
  });
  return data;
}

export async function fetchOpportunityById(id: number): Promise<Opportunity> {
  const { data } = await localApi.get<Opportunity>(`/opportunities/${id}`);
  return data;
}

export async function createOpportunity(
  payload: CreateOpportunityPayload,
): Promise<Opportunity> {
  const now = new Date().toISOString();
  const { data } = await localApi.post<Opportunity>('/opportunities', {
    ...payload,
    createdAt: now,
    updatedAt: now,
  });
  return data;
}

// PATCH plutôt que PUT
export async function updateOpportunity({
  id,
  ...changes
}: UpdateOpportunityPayload): Promise<Opportunity> {
  const { data } = await localApi.patch<Opportunity>(`/opportunities/${id}`, {
    ...changes,
    updatedAt: new Date().toISOString(),
  });
  return data;
}

export async function deleteOpportunity(id: number): Promise<number> {
  await localApi.delete(`/opportunities/${id}`);
  return id;
}

/* ---------- Feedback ---------- */

export async function fetchFeedback(clientId?: number): Promise<Feedback[]> {
  const { data } = await localApi.get<Feedback[]>('/feedback', {
    params: clientId ? { clientId } : undefined,
  });
  return data;
}

export async function createFeedback(
  payload: Omit<Feedback, 'id' | 'createdAt'>,
): Promise<Feedback> {
  const { data } = await localApi.post<Feedback>('/feedback', {
    ...payload,
    createdAt: new Date().toISOString(),
  });
  return data;
}