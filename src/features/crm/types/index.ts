// Types du domaine CRM : clients (DummyJSON), pipeline de vente et feedback (JSON Server).

import type { UserRef } from '@/shared/types';

/* ---------- Réponse brute de DummyJSON ---------- */

// Forme renvoyée par GET /users — on ne déclare que les champs exploités.
export interface DummyJsonUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  image: string;
  company: {
    name: string;
    department: string;
    title: string;
  };
  address: {
    city: string;
    state: string;
    country: string;
  };
  role: string;
}

// Enveloppe de pagination commune à toutes les listes DummyJSON.
export interface DummyJsonList<T> {
  users?: T[];
  products?: T[];
  carts?: T[];
  total: number;
  skip: number;
  limit: number;
}

/* ---------- Client ---------- */

// Client normalisé, exposé aux hooks et aux écrans.
export interface Client {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  companyName: string;
  jobTitle: string;
  department: string;
  city: string;
  country: string;
}

export interface ClientFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

// Liste paginée renvoyée par le service, quel que soit le filtre appliqué.
export interface PaginatedClients {
  items: Client[];
  total: number;
  page: number;
  pageSize: number;
}

/* ---------- Pipeline de vente ---------- */

export type PipelineStageId =
  | 'prospection'
  | 'qualification'
  | 'proposition'
  | 'negociation'
  | 'gagnee'
  | 'perdue';

// Étape du pipeline, persistée dans db.json (collection pipelineStages).
export interface PipelineStage {
  id: PipelineStageId;
  label: string;
  // Position d'affichage dans le tableau kanban.
  order: number;
  // Probabilité de conversion associée à l'étape, en pourcentage.
  probability: number;
}

// Opportunité commerciale, persistée dans db.json (collection opportunities).
export interface Opportunity {
  id: number;
  title: string;
  clientId: number;
  stageId: PipelineStageId;
  // Montant potentiel en euros.
  amount: number;
  expectedCloseDate: string;
  owner?: UserRef;
  createdAt: string;
  updatedAt: string;
}

// Charge utile de création : l'id et les dates sont générés par JSON Server.
export type CreateOpportunityPayload = Omit<
  Opportunity,
  'id' | 'createdAt' | 'updatedAt'
>;

export type UpdateOpportunityPayload = Partial<CreateOpportunityPayload> & {
  id: number;
};

/* ---------- Feedback et NPS ---------- */

// Réponse client à une enquête de satisfaction, persistée dans db.json.
export interface Feedback {
  id: number;
  clientId: number;
  // Note de recommandation de 0 à 10, base du calcul du NPS.
  score: number;
  comment?: string;
  createdAt: string;
}

export type NpsCategory = 'detracteur' | 'passif' | 'promoteur';

// Résultat agrégé du calcul de NPS, consommé par le tableau de bord.
export interface NpsSummary {
  score: number;
  detractors: number;
  passives: number;
  promoters: number;
  total: number;
}