import { useSession } from '@/features/auth';
import styles from './UserMenu.module.css';

export function UserMenu() {
  const { user, role, logout } = useSession();

  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className={styles.menu}>
      <span className={styles.avatar} aria-hidden="true">{initials || '?'}</span>
      <span className={styles.identity}>
        <span className={styles.name}>{user.firstName} {user.lastName}</span>
        {role && <span className={styles.role}>{role}</span>}
      </span>
      <button type="button" className={styles.logoutButton} onClick={logout}>
        Se déconnecter
      </button>
    </div>
  );
}