// Types du domaine CRM : clients (DummyJSON), pipeline de vente et feedback (JSON Server).

import type { UserRef } from '@/shared/types';

/* ---------- Réponses brutes de DummyJSON ---------- */

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

// Ligne de produit dans un panier DummyJSON.
export interface DummyJsonCartProduct {
  id: number;
  title: string;
  price: number;
  quantity: number;
  total: number;
  discountedTotal: number;
  thumbnail: string;
}

// Forme renvoyée par GET /carts — sert d'historique d'achats.
export interface DummyJsonCart {
  id: number;
  userId: number;
  products: DummyJsonCartProduct[];
  total: number;
  discountedTotal: number;
  totalProducts: number;
  totalQuantity: number;
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

/* ---------- Qualification client ---------- */

// Décision commerciale : saisie par l'utilisateur, persistée dans db.json.
export type ClientStatus = 'Lead' | 'Active' | 'Inactive' | 'Churned';

// Calcul objectif : déduit du volume d'achats, jamais saisi à la main.
export type ClientSegment = 'Enterprise' | 'MidMarket' | 'Small' | 'Individual';

// Enregistrement de la collection clientProfiles de db.json.
export interface ClientProfile {
  id: number;
  clientId: number;
  status: ClientStatus;
  notes?: string;
  updatedAt: string;
}

/* ---------- Historique d'achats ---------- */

export interface PurchaseLine {
  productId: number;
  title: string;
  price: number;
  quantity: number;
  total: number;
  thumbnail: string;
}

// Commande passée par un client. DummyJSON ne fournit pas de date de commande.
export interface Purchase {
  id: number;
  totalAmount: number;
  discountedAmount: number;
  itemCount: number;
  products: PurchaseLine[];
}

export interface PurchaseSummary {
  totalSpent: number;
  orderCount: number;
  itemCount: number;
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
  status: ClientStatus;
  segment: ClientSegment;
  totalSpent: number;
  orderCount: number;
}

// Client avec le détail de ses commandes, pour l'écran de fiche.
export interface ClientDetail extends Client {
  purchases: Purchase[];
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

export interface UpdateClientStatusPayload {
  clientId: number;
  status: ClientStatus;
  notes?: string;
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

// Forme renvoyée par GET /comments de JSONPlaceholder.
export interface JsonPlaceholderComment {
  postId: number;
  id: number;
  name: string;
  email: string;
  body: string;
}

// Avis client normalisé. Le score est dérivé de l'identifiant du commentaire,
// JSONPlaceholder ne fournissant aucune note.
export interface Feedback {
  id: number;
  clientId: number;
  // Note de recommandation de 0 à 10, base du calcul du NPS.
  score: number;
  comment?: string;
  authorName: string;
  authorEmail: string;
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