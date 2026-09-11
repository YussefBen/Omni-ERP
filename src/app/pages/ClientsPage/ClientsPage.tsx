import { ClientList } from '@/features/crm/components/ClientList/ClientList';
import { NpsSummary } from '@/features/crm/components/NpsSummary/NpsSummary';
import styles from './ClientsPage.module.css';

export function ClientsPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Clients</h1>
      <NpsSummary />
      <ClientList />
    </div>
  );
}
