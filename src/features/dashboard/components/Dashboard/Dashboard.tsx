import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import type { Kpi } from '@/features/bi';
import { useDashboardData } from '../../hooks/useDashboardData';
import { NotificationsWidget } from '../NotificationsWidget/NotificationsWidget.tsx';
import { WeatherWidget } from '../WeatherWidget/WeatherWidget.tsx';
import styles from './Dashboard.module.css';
import { SupervisionWidget } from '@/features/monitoring';

function formatKpiValue(kpi: Kpi): string {
  const rounded = Math.round(kpi.value * 100) / 100;
  switch (kpi.unit) {
    case 'EUR':
      return `${rounded.toLocaleString('fr-FR')} €`;
    case 'pourcent':
      return `${rounded}%`;
    case 'jours':
      return `${rounded} j`;
    default:
      return `${rounded}`;
  }
}

// Reproduit ici la même règle que kpiLogic.isFavorable (une hausse n'est pas
// toujours une bonne nouvelle) plutôt que de supposer la forme exacte du
// barrel d'exports du domaine BI.
function isFavorable(kpi: Kpi): boolean {
  if (kpi.direction === 'stable') return true;
  const improving = kpi.direction === 'hausse';
  return kpi.lowerIsBetter ? !improving : improving;
}

export function Dashboard() {
  const { data, isLoading, isError, error } = useDashboardData();

  if (isLoading) return <Spinner label="Chargement du tableau de bord..." />;

  if (isError || !data) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Impossible de charger le tableau de bord.'}
      </p>
    );
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tableau de bord</h1>
        <NotificationsWidget />
      </header>

      <div className={styles.highlights}>
        {data.highlights.map((kpi) => (
          <Card key={kpi.label} className={styles.kpiCard}>
            <p className={styles.kpiLabel}>{kpi.label}</p>
            <p className={styles.kpiValue}>{formatKpiValue(kpi)}</p>
            <span
              className={`${styles.kpiDelta} ${
                isFavorable(kpi) ? styles.favorable : styles.unfavorable
              }`}
            >
              {kpi.direction === 'hausse' ? '▲' : kpi.direction === 'baisse' ? '▼' : '—'}{' '}
              {Math.abs(kpi.deltaPercent)}%
            </span>
          </Card>
        ))}
      </div>

      <div className={styles.widgetsRow}>
        <WeatherWidget />
        <SupervisionWidget />

        <Card className={styles.alertsCard}>
          <h2 className={styles.alertsTitle}>
            Alertes de stock
            {data.criticalAlertCount > 0 && (
              <span className={styles.criticalBadge}>{data.criticalAlertCount} critique(s)</span>
            )}
          </h2>
          {data.alerts.length === 0 ? (
            <p className={styles.empty}>Aucune alerte de stock.</p>
          ) : (
            <ul className={styles.alertsList}>
              {data.alerts.map((alert) => (
                <li key={alert.product.id} className={styles.alertItem}>
                  <span
                    className={`${styles.severityDot} ${styles[alert.severity]}`}
                    aria-hidden="true"
                  />
                  <span className={styles.alertName}>{alert.product.name}</span>
                  <span className={styles.alertQuantity}>
                    +{alert.missingQuantity} à commander
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
