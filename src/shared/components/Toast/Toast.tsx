import styles from './Toast.module.css';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
}

export function Toast({ message, variant = 'info' }: ToastProps) {
  return (
    <div className={`${styles.toast} ${styles[variant]}`} role="status">
      {message}
    </div>
  );
}