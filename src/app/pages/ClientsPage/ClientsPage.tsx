import { ClientList } from '@/features/crm/components/ClientList/ClientList';
import styles from './ClientsPage.module.css';

export function ClientsPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Clients</h1>
      <ClientList />
    </div>
  );
}
