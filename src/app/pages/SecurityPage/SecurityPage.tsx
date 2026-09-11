import { AuditLogViewer } from '@/features/security';
import styles from './SecurityPage.module.css';

export function SecurityPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Journal d'audit</h1>
      <AuditLogViewer />
    </div>
  );
}