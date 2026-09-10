export interface AuthUserMock {
  id: number;
  name: string;
  role: 'admin' | 'manager' | 'user';
}

interface UseAuthMockResult {
  isAuthenticated: boolean;
  user: AuthUserMock | null;
  isLoading: boolean;
}

// Modifier ces deux constantes pour tester visuellement les différents états
// (connecté / déconnecté / rôle) tant que le vrai useAuth() n'est pas livré par Membre A.
const MOCK_AUTHENTICATED = true;
const MOCK_USER: AuthUserMock = { id: 1, name: 'Rafael', role: 'manager' };

// Simule le futur useAuth() de Membre A (même principe que les hooks de temp-hooks/).
// À supprimer et remplacer par l'import réel dès que le hook officiel est livré :
// import { useAuth } from "@/features/auth/hooks/useAuth";
export function useAuthMock(): UseAuthMockResult {
  return {
    isAuthenticated: MOCK_AUTHENTICATED,
    user: MOCK_AUTHENTICATED ? MOCK_USER : null,
    isLoading: false,
  };
}
