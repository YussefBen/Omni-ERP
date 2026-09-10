import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useAnalytics } from '../../hooks/useAnalytics';
import styles from './SalesByCategoryChart.module.css';

const COLORS = ['#3b82f6', '#16a34a', '#f5a623', '#e5484d', '#8b5cf6', '#06b6d4', '#f472b6', '#84cc16'];

export function SalesByCategoryChart() {
  const { data, isLoading, isError, error } = useAnalytics();

  if (isLoading) return <Spinner label="Chargement des ventes par catégorie..." />;

  if (isError || !data) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Impossible de charger la répartition des ventes.'}
      </p>
    );
  }

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Répartition des ventes par catégorie</h2>

      {data.salesByCategory.length === 0 ? (
        <p className={styles.empty}>Aucune vente enregistrée.</p>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={data.salesByCategory}
              dataKey="value"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={110}
              // Le callback label() de Recharts ne reçoit pas directement notre objet de
              // données (category/share ne sont pas dessus) : on utilise "name" et "percent",
              // les équivalents déjà calculés nativement par Recharts pour un Pie.
              label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
            >
              {data.salesByCategory.map((entry, index) => (
                <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            {/* Même remarque que pour TeamPerformanceChart : pas d'annotation explicite sur
                "value", pour laisser Recharts fournir son propre type (ValueType). */}
            <RechartsTooltip formatter={(value) => `${Number(value).toFixed(2)} €`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
