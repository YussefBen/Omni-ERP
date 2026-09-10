import styles from './Spinner.module.css';

export function Spinner({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <div className={styles.spinner} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}