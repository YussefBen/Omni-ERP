import type { ReactNode } from 'react';
import { useAuthMock, type AuthUserMock } from '../../temp-hooks/useAuthMock';
import styles from './ProtectedRouteWrapper.module.css';

interface ProtectedRouteWrapperProps {
  children: ReactNode;
  // Rôles autorisés à voir le contenu ; si omis, seule l'authentification est vérifiée
  allowedRoles?: AuthUserMock['role'][];
}

// Enveloppe visuelle en attendant le ProtectedRoute + withAuth réels de Membre A
// (redirection vers /login, refresh token, etc. seront gérés par eux, branchés sur le router).
// Repose sur useAuthMock pour l'instant, à remplacer par useAuth() une fois livré —
// même logique que les hooks de src/shared/temp-hooks/.
export function ProtectedRouteWrapper({ children, allowedRoles }: ProtectedRouteWrapperProps) {
  const { isAuthenticated, user, isLoading } = useAuthMock();

  if (isLoading) {
    return <div className={styles.state}>Vérification de la session...</div>;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className={styles.state} role="alert">
        Accès refusé — vous devez être connecté pour accéder à cette page.
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className={styles.state} role="alert">
        Accès refusé — votre rôle ({user.role}) ne permet pas d'accéder à cette page.
      </div>
    );
  }

  return <>{children}</>;
}
