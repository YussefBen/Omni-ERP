import { useSession } from '@/features/auth';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Role } from '@/shared/types';
import styles from './UserMenu.module.css';

const ROLES: Role[] = ['admin', 'manager', 'user'];

// Affiche qui est connecté et permet de se déconnecter. Nécessaire depuis que
// ProtectedRoute impose vraiment une session : sans ça, impossible de changer
// de compte ou de vérifier qui est connecté sans vider le localStorage à la main.
export function UserMenu() {
  const { user, role, logout } = useSession();

  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className={styles.menu}>
      <span className={styles.avatar} aria-hidden="true">
        {initials || '?'}
      </span>
      <span className={styles.identity}>
        <span className={styles.name}>{user.firstName} {user.lastName}</span>
        {role && <span className={styles.role}>{role}</span>}
      </span>

      <select
        className={styles.devRoleSelect}
        value={role ?? 'user'}
        onChange={(event) => useAuthStore.setState({ role: event.target.value as Role })}
        aria-label="Changer de rôle"
        title="Changer de rôle"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <button type="button" className={styles.logoutButton} onClick={logout}>
        Se déconnecter
      </button>
    </div>
  );
}