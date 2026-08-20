import type { Role } from '@/shared/types';

const ROLE_CYCLE: Role[] = ['admin', 'manager', 'user'];

export function deriveRole(seed: number): Role {
  return ROLE_CYCLE[seed % ROLE_CYCLE.length];
}