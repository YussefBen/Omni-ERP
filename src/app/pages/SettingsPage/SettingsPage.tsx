import { ProfileSettings } from '@/features/settings/components/ProfileSettings/ProfileSettings';
import { ThemeSettings } from '@/features/settings/components/ThemeSettings/ThemeSettings';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Paramètres</h1>
      <div className={styles.grid}>
        <ProfileSettings />
        <ThemeSettings />
      </div>
    </div>
  );
}
