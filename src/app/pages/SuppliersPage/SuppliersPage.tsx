import { SupplierList } from '@/features/erp/components/SupplierList/SupplierList';
import styles from './SuppliersPage.module.css';

export function SuppliersPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Fournisseurs</h1>
      <SupplierList />
    </div>
  );
}
