import type { Role } from '@/shared/types';


// Forme renvoyée par Reqres pour un compte utilisateur.
export interface ReqresUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
}

// Enveloppe de GET /users/{id}.
export interface ReqresSingleUserResponse {
  data: ReqresUser;
}

// Enveloppe paginée de GET /users.
export interface ReqresUserListResponse {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  data: ReqresUser[];
}

// Réponse de POST /login : Reqres ne renvoie qu'un jeton, aucun profil.
export interface ReqresLoginResponse {
  token: string;
}

// Réponse de POST /register.
export interface ReqresRegisterResponse {
  id: number;
  token: string;
}



// Utilisateur exposé aux hooks et aux écrans, reconstruit à partir de Reqres.
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  role: Role;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
}

// Charge utile de mise à jour de compte 
export interface UpdateUserPayload {
  id: number;
  name: string;
  job: string;
}

export interface UpdatedUserResult {
  name: string;
  job: string;
  updatedAt: string;
}


// Session active, persistée par authStore.
export interface Session {
  user: User;
  token: string;
  // Timestamp epoch ms d'expiration simulée (Reqres n'expose pas de vraie expiration).
  expiresAt: number;
}