import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useNps } from '../../hooks/useFeedback';
import styles from './NpsSummary.module.css';

function npsColor(score: number): string {
  if (score >= 50) return styles.good;
  if (score >= 0) return styles.average;
  return styles.bad;
}

export function NpsSummary() {
  const { data: summary, averageScore, isLoading, isError, error } = useNps();

  if (isLoading) return <Spinner label="Calcul du NPS..." />;

  if (isError || !summary) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Impossible de calculer le NPS.'}
      </p>
    );
  }

  return (
    <Card className={styles.card}>
      <div className={styles.scoreBlock}>
        <span className={`${styles.score} ${npsColor(summary.score)}`}>{summary.score}</span>
        <span className={styles.scoreLabel}>Net Promoter Score</span>
      </div>

      <div className={styles.breakdown}>
        <span className={styles.promoters}>{summary.promoters} promoteurs</span>
        <span className={styles.passives}>{summary.passives} passifs</span>
        <span className={styles.detractors}>{summary.detractors} détracteurs</span>
      </div>

      <p className={styles.meta}>
        {summary.total} avis — note moyenne {averageScore.toFixed(1)}/10
      </p>
    </Card>
  );
}