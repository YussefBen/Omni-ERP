// Même chose que ProtectedRoute, mais en HOC (pratique pour wrapper une page directement)

import type { ComponentType } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner } from '@/shared/components';
import { useSession } from '../hooks/useSession';

export function withAuth<P extends object>(Component: ComponentType<P>) {
  function WithAuth(props: P) {
    const { isAuthenticated, isLoading } = useSession();

    if (isLoading) return <Spinner label="Vérification de la session..." />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    return <Component {...props} />;
  }

  WithAuth.displayName = `withAuth(${Component.displayName ?? Component.name ?? 'Component'})`;
  return WithAuth;
}