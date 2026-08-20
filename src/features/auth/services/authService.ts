// Appels à l'API Reqres pour le login, l'inscription et les comptes

import axios from 'axios';
import { API_CONFIG } from '@/shared/config/api';
import { deriveRole } from './roleAssignment';
import type {
  AuthResponse,
  LoginPayload,
  PaginatedUsers,
  RegisterPayload,
  ReqresLoginResponse,
  ReqresRegisterResponse,
  ReqresSingleUserResponse,
  ReqresUser,
  ReqresUserListResponse,
  UpdatedUserResult,
  UpdateUserPayload,
  User,
} from '../types';

const authApi = axios.create({ baseURL: API_CONFIG.reqres, timeout: 10000 });

// Transforme un user Reqres en notre User
function toUser(reqresUser: ReqresUser): User {
  return {
    id: reqresUser.id,
    email: reqresUser.email,
    firstName: reqresUser.first_name,
    lastName: reqresUser.last_name,
    avatarUrl: reqresUser.avatar,
    role: deriveRole(reqresUser.id),
  };
}

// Si l'email ne correspond à aucun compte Reqres, on invente un profil basique
function fallbackUser(email: string): User {
  const [localPart] = email.split('@');
  return {
    id: 0,
    email,
    firstName: localPart ?? email,
    lastName: '',
    avatarUrl: '',
    role: deriveRole(email.length),
  };
}

// Reqres a 12 comptes sur 2 pages, on cherche l'email dans les deux
async function findUserByEmail(email: string): Promise<ReqresUser | undefined> {
  const [page1, page2] = await Promise.all([
    authApi.get<ReqresUserListResponse>('/users', { params: { page: 1 } }),
    authApi.get<ReqresUserListResponse>('/users', { params: { page: 2 } }),
  ]);
  const allUsers = [...page1.data.data, ...page2.data.data];
  return allUsers.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
}

// Login : Reqres renvoie juste un token, on va chercher le profil à côté
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await authApi.post<ReqresLoginResponse>('/login', payload);
  const matched = await findUserByEmail(payload.email);
  const user = matched ? toUser(matched) : fallbackUser(payload.email);
  return { token: data.token, user };
}

// Inscription, puis on récupère le profil créé (pour l'auto-login)
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await authApi.post<ReqresRegisterResponse>('/register', payload);
  const { data: profile } = await authApi.get<ReqresSingleUserResponse>(`/users/${data.id}`);
  return { token: data.token, user: toUser(profile.data) };
}

// Liste des comptes (pour un futur écran admin)
export async function fetchUsers(page = 1): Promise<PaginatedUsers> {
  const { data } = await authApi.get<ReqresUserListResponse>('/users', { params: { page } });
  return {
    items: data.data.map(toUser),
    total: data.total,
    page: data.page,
    pageSize: data.per_page,
  };
}

export async function updateUser(payload: UpdateUserPayload): Promise<UpdatedUserResult> {
  const { id, ...body } = payload;
  const { data } = await authApi.put<UpdatedUserResult>(`/users/${id}`, body);
  return data;
}

export async function deleteUser(id: number): Promise<void> {
  await authApi.delete(`/users/${id}`);
}