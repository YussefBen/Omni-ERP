import { OrderList } from '@/features/erp/components/OrderList/OrderList';
import styles from './OrdersPage.module.css';

export function OrdersPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Commandes</h1>
      <OrderList />
    </div>
  );
}
