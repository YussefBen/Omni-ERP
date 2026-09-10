import { useAuthStore } from '@/features/auth/store/authStore';

// authStore aplatit la session : pas de champ `session`, mais directement
// `user`, `token`, `role`, `expiresAt`, `isAuthenticated` sur le state.
export function useCurrentUserId(): number | undefined {
  return useAuthStore((state) => state.user?.id);
}