import { useState } from 'react';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useAuditLog } from '../../hooks/useSecurity';
import type { AuditAction, AuditResult } from '../../types';
import styles from './AuditLogViewer.module.css';

const RESULT_LABELS: Record<AuditResult, string> = {
  succes: 'Succès',
  echec: 'Échec',
  refuse: 'Refusé',
};

const ACTIONS: AuditAction[] = [
  'login.success',
  'login.failure',
  'login.blocked',
  'logout',
  'register',
  'client.status.update',
  'opportunity.create',
  'opportunity.update',
  'opportunity.delete',
  'order.status.update',
  'supplier.evaluate',
  'stock.movement.create',
  'report.export',
];

export function AuditLogViewer() {
  const [action, setAction] = useState<AuditAction | ''>('');
  const [result, setResult] = useState<AuditResult | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, totalPages, isAllowed } = useAuditLog({
    action: action || undefined,
    result: result || undefined,
    page,
  });

  if (!isAllowed) {
    return (
      <p role="alert" className={styles.forbidden}>
        Le journal d'audit est réservé aux administrateurs.
      </p>
    );
  }

  if (isLoading) return <Spinner label="Chargement du journal..." />;

  if (isError) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Impossible de charger le journal.'}
      </p>
    );
  }

  return (
    <Card className={styles.card}>
      <div className={styles.toolbar}>
        <select
          className={styles.select}
          value={action}
          onChange={(event) => {
            setAction(event.target.value as AuditAction | '');
            setPage(1);
          }}
          aria-label="Filtrer par action"
        >
          <option value="">Toutes les actions</option>
          {ACTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={result}
          onChange={(event) => {
            setResult(event.target.value as AuditResult | '');
            setPage(1);
          }}
          aria-label="Filtrer par résultat"
        >
          <option value="">Tous les résultats</option>
          {Object.entries(RESULT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Utilisateur</th>
            <th>Action</th>
            <th>Résultat</th>
            <th>Détail</th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map((entry) => (
            <tr key={entry.id}>
              <td>{new Date(entry.occurredAt).toLocaleString('fr-FR')}</td>
              <td>{entry.userEmail ?? '—'}</td>
              <td>{entry.action}</td>
              <td>
                <span className={`${styles.resultBadge} ${styles[entry.result]}`}>
                  {RESULT_LABELS[entry.result]}
                </span>
              </td>
              <td className={styles.details}>{entry.details ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data?.items.length === 0 && <p className={styles.empty}>Aucune entrée.</p>}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </button>
        </div>
      )}
    </Card>
  );
}