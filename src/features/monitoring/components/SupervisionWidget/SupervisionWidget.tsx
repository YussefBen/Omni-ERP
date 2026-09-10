import { Card } from '@/shared/components/Card/Card';
import { useHealthChecks, useWebVitals } from '@/features/monitoring';
import styles from './SupervisionWidget.module.css';

const STATUS_LABEL: Record<string, string> = {
  ok: 'OK',
  degraded: 'Ralenti',
  down: 'Panne',
};

function formatMs(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)} ms`;
}

export function SupervisionWidget() {
  const { data: services, isLoading } = useHealthChecks();
  const vitals = useWebVitals();

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Supervision</h2>

      <section>
        <h3 className={styles.sectionTitle}>Services</h3>
        {isLoading || !services ? (
          <p className={styles.info}>Vérification en cours...</p>
        ) : (
          <ul className={styles.serviceList}>
            {services.map((service) => (
              <li key={service.name} className={styles.serviceItem}>
                <span
                  className={`${styles.statusDot} ${styles[service.status]}`}
                  aria-hidden="true"
                />
                <span className={styles.serviceName}>{service.name}</span>
                <span className={styles.serviceStatus}>
                  {STATUS_LABEL[service.status]}
                  {service.latencyMs !== null && ` · ${service.latencyMs} ms`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className={styles.sectionTitle}>Performance ressentie</h3>
        <div className={styles.vitalsGrid}>
          <span>CLS {vitals.cls ?? '—'}</span>
          <span>INP {formatMs(vitals.inp)}</span>
          <span>LCP {formatMs(vitals.lcp)}</span>
          <span>FCP {formatMs(vitals.fcp)}</span>
          <span>TTFB {formatMs(vitals.ttfb)}</span>
        </div>
      </section>
    </Card>
  );
}