import { Pipeline } from '@/features/crm/components/Pipeline/Pipeline';
import styles from './PipelinePage.module.css';

export function PipelinePage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Pipeline de vente</h1>
      <Pipeline />
    </div>
  );
}
