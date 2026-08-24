import axios from 'axios';
import { API_CONFIG } from '@/shared/config/api';
import { DEFAULT_PAGE_SIZE } from '@/shared/config/constants';
import {
  getDefaultStatus,
  getSegment,
  summarizePurchases,
  toPurchase,
} from '../hooks/clientLogic';
import { toFeedback } from '../hooks/feedbackMapper';
import { sanitizeText } from '@/shared/utils/sanitize';
import type {
  Client,
  ClientDetail,
  ClientFilters,
  ClientProfile,
  CreateOpportunityPayload,
  DummyJsonCart,
  DummyJsonList,
  DummyJsonUser,
  Feedback,
  Opportunity,
  PaginatedClients,
  PipelineStage,
  PurchaseSummary,
  UpdateClientStatusPayload,
  UpdateOpportunityPayload,
  JsonPlaceholderComment,
} from '../types';

const clientsApi = axios.create({ baseURL: API_CONFIG.dummyJson, timeout: 10000 });
const localApi = axios.create({ baseURL: API_CONFIG.jsonServer, timeout: 10000 });
const feedbackApi = axios.create({ baseURL: API_CONFIG.jsonPlaceholder, timeout: 10000 });

// Champs réellement exploités par le CRM : on ignore le reste de la réponse DummyJSON,
// qui contient des données sensibles (mot de passe, coordonnées bancaires, SSN).
const CLIENT_FIELDS = 'firstName,lastName,email,phone,image,company,address,role';

/* ---------- Clients ---------- */

// Convertit la réponse brute de DummyJSON en client normalisé.
// Le statut vient de db.json, le segment se calcule depuis les achats.
function toClient(
  user: DummyJsonUser,
  summary: PurchaseSummary,
  profile?: ClientProfile,
): Client {
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
    status: profile?.status ?? getDefaultStatus(summary.orderCount),
    segment: getSegment(summary.totalSpent),
    totalSpent: summary.totalSpent,
    orderCount: summary.orderCount,
  };
}

// Tous les paniers en un appel, indexés par client : évite une requête
// par ligne de la liste, qui saturerait l'API à chaque changement de page.
async function fetchCartsByUser(): Promise<Map<number, DummyJsonCart[]>> {
  const { data } = await clientsApi.get<DummyJsonList<DummyJsonCart>>('/carts', {
    params: { limit: 0 },
  });

  const index = new Map<number, DummyJsonCart[]>();
  for (const cart of data.carts ?? []) {
    const existing = index.get(cart.userId);
    if (existing) existing.push(cart);
    else index.set(cart.userId, [cart]);
  }
  return index;
}

async function fetchClientProfiles(): Promise<Map<number, ClientProfile>> {
  const { data } = await localApi.get<ClientProfile[]>('/clientProfiles');
  return new Map(data.map((profile) => [profile.clientId, profile]));
}

// Liste paginée des clients. Un terme de recherche bascule sur l'endpoint dédié,
// la recherche restant faite côté serveur pour ne pas charger toute la base.
export async function fetchClients(filters: ClientFilters = {}): Promise<PaginatedClients> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const search = filters.search?.trim();

  const path = search ? '/users/search' : '/users';

  const [usersResponse, cartsByUser, profiles] = await Promise.all([
    clientsApi.get<DummyJsonList<DummyJsonUser>>(path, {
      params: {
        limit: pageSize,
        skip: (page - 1) * pageSize,
        select: CLIENT_FIELDS,
        ...(search ? { q: search } : {}),
      },
    }),
    fetchCartsByUser(),
    fetchClientProfiles(),
  ]);

  const items = (usersResponse.data.users ?? []).map((user) =>
    toClient(
      user,
      summarizePurchases(cartsByUser.get(user.id) ?? []),
      profiles.get(user.id),
    ),
  );

  return { items, total: usersResponse.data.total, page, pageSize };
}

// Fiche client complète, avec le détail de chaque commande.
export async function fetchClientById(id: number): Promise<ClientDetail> {
  const [userResponse, cartsResponse, profiles] = await Promise.all([
    clientsApi.get<DummyJsonUser>(`/users/${id}`, { params: { select: CLIENT_FIELDS } }),
    clientsApi.get<DummyJsonList<DummyJsonCart>>(`/carts/user/${id}`),
    fetchClientProfiles(),
  ]);

  const carts = cartsResponse.data.carts ?? [];
  const summary = summarizePurchases(carts);

  return {
    ...toClient(userResponse.data, summary, profiles.get(id)),
    purchases: carts.map(toPurchase),
  };
}

// Qualification manuelle d'un client. Crée le profil s'il n'existe pas encore.
export async function updateClientStatus({
  clientId,
  status,
  notes,
}: UpdateClientStatusPayload): Promise<ClientProfile> {
  const { data: existing } = await localApi.get<ClientProfile[]>('/clientProfiles', {
    params: { clientId },
  });

 const payload = {
    clientId,
    status,
    notes: notes ? sanitizeText(notes) : notes,
    updatedAt: new Date().toISOString(),
  };

  if (existing.length > 0) {
    const { data } = await localApi.patch<ClientProfile>(
      `/clientProfiles/${existing[0].id}`,
      payload,
    );
    return data;
  }

  const { data } = await localApi.post<ClientProfile>('/clientProfiles', payload);
  return data;
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

// Source imposée par le brief : JSONPlaceholder /comments, en lecture seule.
// L'API n'expose aucune note, le score est dérivé de l'identifiant du commentaire.
export async function fetchFeedback(clientId?: number): Promise<Feedback[]> {
  const { data } = await feedbackApi.get<JsonPlaceholderComment[]>('/comments', {
    // Le postId sert de rattachement client.
    params: clientId ? { postId: clientId } : undefined,
  });
  return data.map(toFeedback);
}