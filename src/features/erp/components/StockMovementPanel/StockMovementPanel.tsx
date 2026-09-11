import { useState, type FormEvent } from 'react';
import { useCreateStockMovement, useStockMovements, useStockRotation } from '../../hooks/useStock';
import type { StockMovementType } from '../../types';
import styles from './StockMovementPanel.module.css';

const TYPE_LABELS: Record<StockMovementType, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  ajustement: 'Ajustement',
};

interface StockMovementPanelProps {
  productId: number;
}

export function StockMovementPanel({ productId }: StockMovementPanelProps) {
  const movementsQuery = useStockMovements(productId);
  const rotationQuery = useStockRotation(productId);
  const { mutate: createMovement, isPending, isError, error } = useCreateStockMovement();

  const [type, setType] = useState<StockMovementType>('entree');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (!reason.trim() || parsedQuantity <= 0) return;

    createMovement({ productId, type, quantity: parsedQuantity, reason: reason.trim() });
    setQuantity('1');
    setReason('');
  }

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Mouvements de stock</h3>

      {rotationQuery.data && (
        <div className={styles.rotationStats}>
          <span>Taux de rotation : {rotationQuery.data.turnoverRate.toFixed(2)}</span>
          <span>{rotationQuery.data.daysOfInventory.toFixed(0)} jours d'écoulement moyen</span>
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <select
          className={styles.select}
          value={type}
          onChange={(event) => setType(event.target.value as StockMovementType)}
          aria-label="Type de mouvement"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          className={styles.quantityInput}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          aria-label="Quantité"
        />
        <input
          type="text"
          placeholder="Motif (ex : réception fournisseur, casse, inventaire)"
          className={styles.reasonInput}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-label="Motif du mouvement"
        />
        <button type="submit" className={styles.submitButton} disabled={isPending}>
          {isPending ? 'Enregistrement...' : 'Ajouter'}
        </button>
      </form>

      {isError && (
        <p role="alert" className={styles.error}>
          {error?.message ?? 'Impossible d\'enregistrer ce mouvement.'}
        </p>
      )}

      {movementsQuery.data && movementsQuery.data.length > 0 && (
        <ul className={styles.history}>
          {movementsQuery.data.slice(0, 5).map((movement) => (
            <li key={movement.id} className={styles.historyItem}>
              <span className={`${styles.typeBadge} ${styles[movement.type]}`}>
                {TYPE_LABELS[movement.type]}
              </span>
              <span className={styles.historyQuantity}>{movement.quantity}</span>
              <span className={styles.historyReason}>{movement.reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}