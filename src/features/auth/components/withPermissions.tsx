// Cache le composant si le rôle du user n'est pas autorisé (RBAC)
import type { ComponentType } from 'react';
import type { Role } from '@/shared/types';
import { useSession } from '../hooks/useSession';

export function withPermissions<P extends object>(
  Component: ComponentType<P>,
  allowedRoles: Role[],
) {
  function WithPermissions(props: P) {
    const { role } = useSession();

    if (!role || !allowedRoles.includes(role)) {
      return null;
    }

    return <Component {...props} />;
  }

  WithPermissions.displayName = `withPermissions(${Component.displayName ?? Component.name ?? 'Component'})`;
  return WithPermissions;
}