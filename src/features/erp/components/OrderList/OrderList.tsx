import { memo, useCallback, useState } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { getAllowedOrderTransitions, useOrders, useUpdateOrderStatus } from '../../hooks/useOrders';
import type { Order, OrderStatus } from '../../types';
import styles from './OrderList.module.css';

const STATUS_LABELS: Record<OrderStatus, string> = {
  brouillon: 'Brouillon',
  confirmee: 'Confirmée',
  preparation: 'En préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée',
};

// Nombre de lignes détaillées avant regroupement, pour garder des cartes
// de hauteur comparable quel que soit le nombre d'articles.
const VISIBLE_LINES = 3;

interface OrderCardProps {
  order: Order;
  isUpdating: boolean;
  onTransition: (order: Order, nextStatus: OrderStatus) => void;
}

/**
 * Carte d'une commande.
 *
 * memo évite de rerendre toutes les commandes affichées quand une seule
 * change de statut. La fonction de transition est stabilisée par
 * useCallback côté parent : sans cela, une nouvelle référence à chaque
 * rendu suffirait à invalider la mémorisation.
 */
const OrderCard = memo(function OrderCard({ order, isUpdating, onTransition }: OrderCardProps) {
  const allowedTransitions = getAllowedOrderTransitions(order.status);
  const hasDiscount = order.discountedAmount < order.totalAmount;

  return (
    <Card className={styles.orderCard}>
      <div className={styles.orderHeader}>
        <span className={styles.orderId}>Commande #{order.id}</span>
        <span className={`${styles.statusBadge} ${styles[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <p className={styles.orderMeta}>
        {order.itemCount} article(s) — {order.totalAmount.toFixed(2)} €
        {hasDiscount && <> (remisé : {order.discountedAmount.toFixed(2)} €)</>}
      </p>

      <ul className={styles.linesList}>
        {order.lines.slice(0, VISIBLE_LINES).map((line) => (
          <li key={line.productId} className={styles.line}>
            <img src={line.thumbnail} alt="" className={styles.lineThumb} loading="lazy" />
            <span>
              {line.title} × {line.quantity}
            </span>
          </li>
        ))}
        {order.lines.length > VISIBLE_LINES && (
          <li className={styles.lineMore}>
            +{order.lines.length - VISIBLE_LINES} autre(s) article(s)
          </li>
        )}
      </ul>

      {allowedTransitions.length > 0 && (
        <div className={styles.transitions}>
          {allowedTransitions.map((nextStatus) => (
            <Button
              key={nextStatus}
              variant={nextStatus === 'annulee' ? 'danger' : 'primary'}
              disabled={isUpdating}
              onClick={() => onTransition(order, nextStatus)}
            >
              {STATUS_LABELS[nextStatus]}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
});

export function OrderList() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, error, totalPages } = useOrders({
    status: status || undefined,
    page,
  });

  const { mutate: updateStatus, isPending: isUpdating } = useUpdateOrderStatus();

  // Référence stable : sans useCallback, une nouvelle fonction serait
  // créée à chaque rendu et memo sur les cartes n'aurait aucun effet.
  //
  // On passe l'objet order complet : useUpdateOrderStatus s'en sert (côté
  // client, jamais envoyé à l'API) pour générer les mouvements de stock
  // correspondants après succès.
  const handleTransition = useCallback(
    (order: Order, nextStatus: OrderStatus) => {
      updateStatus({ orderId: order.id, status: nextStatus, order });
    },
    [updateStatus],
  );

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <select
          className={styles.select}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as OrderStatus | '');
            setPage(1);
          }}
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <Spinner label="Chargement des commandes..." />}

      {isError && (
        <p role="alert" className={styles.error}>
          {error?.message ?? 'Impossible de charger les commandes.'}
        </p>
      )}

      {!isLoading && !isError && (
        <>
          <div className={styles.list}>
            {data?.items.length === 0 && (
              <p className={styles.empty}>Aucune commande ne correspond à ces critères.</p>
            )}
            {data?.items.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isUpdating={isUpdating}
                onTransition={handleTransition}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Précédent
              </Button>
              <span className={styles.pageInfo}>
                Page {page} / {totalPages}
                {isFetching ? '…' : ''}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}