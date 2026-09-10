export interface ApiError {
  message: string;
  status?: number;
}

export type Role = 'admin' | 'manager' | 'user';

export interface UserRef {
  id: number;
  name: string;
  avatarUrl?: string;
}