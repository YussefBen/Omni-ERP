import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useOrder } from '../../hooks/useOrders';
import type { OrderStatus } from '../../types';
import styles from './OrderDetail.module.css';

const STATUS_LABELS: Record<OrderStatus, string> = {
  brouillon: 'Brouillon',
  confirmee: 'Confirmée',
  preparation: 'En préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée',
};

interface OrderDetailProps {
  orderId: number;
  onClose: () => void;
}

export function OrderDetail({ orderId, onClose }: OrderDetailProps) {
  const { data: order, isLoading, isError, error } = useOrder(orderId);

  if (isLoading) return <Spinner label="Chargement de la commande..." />;

  if (isError || !order) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Commande introuvable.'}
      </p>
    );
  }

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Commande #{order.id}</h2>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </div>

      <dl className={styles.metaList}>
        <div className={styles.metaRow}>
          <dt>Statut</dt>
          <dd className={`${styles.statusBadge} ${styles[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </dd>
        </div>
        <div className={styles.metaRow}>
          <dt>Client</dt>
          <dd>#{order.clientId}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt>Passée le</dt>
          <dd>{new Date(order.placedAt).toLocaleDateString('fr-FR')}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt>Dernière mise à jour</dt>
          <dd>{new Date(order.updatedAt).toLocaleDateString('fr-FR')}</dd>
        </div>
      </dl>

      <h3 className={styles.linesTitle}>Articles ({order.itemCount})</h3>
      <ul className={styles.linesList}>
        {order.lines.map((line) => (
          <li key={line.productId} className={styles.line}>
            <img src={line.thumbnail} alt="" className={styles.lineThumb} loading="lazy" />
            <span className={styles.lineTitle}>{line.title}</span>
            <span className={styles.lineQuantity}>× {line.quantity}</span>
          </li>
        ))}
      </ul>

      <div className={styles.totalRow}>
        {order.discountedAmount < order.totalAmount && (
          <span className={styles.oldTotal}>{order.totalAmount.toFixed(2)} €</span>
        )}
        <span className={styles.total}>{order.discountedAmount.toFixed(2)} €</span>
      </div>
    </Card>
  );
}