import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useKPIs } from '../../hooks/useKPIs';
import styles from './ProjectsEvolutionChart.module.css';

// Project n'a pas de date de création et ProjectsKpiRaw n'expose qu'un instantané
// (valeur actuelle vs période précédente) : impossible de tracer une vraie courbe
// mensuelle. On compare donc les deux périodes réellement disponibles, par métrique.
export function ProjectsEvolutionChart() {
  const { data, isLoading, isError, error } = useKPIs();

  if (isLoading) return <Spinner label="Chargement des indicateurs projets..." />;

  if (isError || !data) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Impossible de charger les indicateurs projets.'}
      </p>
    );
  }

  const { projects } = data;
  const chartData = [
    { metric: 'Total', actuelle: projects.total.value, precedente: projects.total.previousValue },
    { metric: 'Actifs', actuelle: projects.active.value, precedente: projects.active.previousValue },
    {
      metric: 'En retard',
      actuelle: projects.overdue.value,
      precedente: projects.overdue.previousValue,
    },
  ];

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Évolution des projets</h2>
      <p className={styles.subtitle}>
        Période actuelle vs précédente ({data.range.current.from.slice(0, 10)} →{' '}
        {data.range.current.to.slice(0, 10)})
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="metric" />
          <YAxis allowDecimals={false} />
          <RechartsTooltip />
          <Legend />
          <Bar dataKey="precedente" name="Période précédente" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="actuelle" name="Période actuelle" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
