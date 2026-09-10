// Bloque l'accès si pas connecté, redirige vers /login

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@/shared/components';
import { useSession } from '../hooks/useSession';
import type { Role } from '@/shared/types';

interface ProtectedRouteProps {
  children: ReactNode;
  // Rôles autorisés à voir la route
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useSession();
  const location = useLocation();

  if (isLoading) {
    return <Spinner label="Vérification de la session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return (
      <p role="alert" style={{ padding: '2rem' }}>
        Accès refusé — votre rôle ne permet pas d'accéder à cette page.
      </p>
    );
  }

  return <>{children}</>;
}