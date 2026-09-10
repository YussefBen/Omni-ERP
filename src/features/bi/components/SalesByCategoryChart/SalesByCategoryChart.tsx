import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useAnalytics } from '../../hooks/useAnalytics';
import { groupSmallShares, OTHER_CATEGORY_LABEL } from '../../hooks/analyticsLogic';
import styles from './SalesByCategoryChart.module.css';

const COLORS = ['#3b82f6', '#16a34a', '#f5a623', '#e5484d', '#8b5cf6', '#06b6d4', '#f472b6', '#84cc16'];

// Gris neutre : la part « Autres » ne doit pas attirer l'œil.
const OTHER_COLOR = '#94a3b8';

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

  // Vingt-quatre catégories rendent le camembert illisible : les plus
  // petites sont regroupées pour l'affichage. Les exports gardent le détail.
  const slices = groupSmallShares(data.salesByCategory);

  // Les pourcentages vont dans la légende : des étiquettes autour du
  // camembert débordent de la carte dès que l'écran est un peu étroit.
  const legendLabel = (category: string) => {
    const slice = slices.find((entry) => entry.category === category);
    return slice ? `${category} (${slice.share.toLocaleString('fr-FR')} %)` : category;
  };

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Répartition des ventes par catégorie</h2>

      {data.salesByCategory.length === 0 ? (
        <p className={styles.empty}>Aucune vente enregistrée.</p>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={110}
            >
              {slices.map((entry, index) => (
                <Cell
                  key={entry.category}
                  fill={
                    entry.category === OTHER_CATEGORY_LABEL
                      ? OTHER_COLOR
                      : COLORS[index % COLORS.length]
                  }
                />
              ))}
            </Pie>
            {/* Même remarque que pour TeamPerformanceChart : pas d'annotation explicite sur
                "value", pour laisser Recharts fournir son propre type (ValueType). */}
            <RechartsTooltip formatter={(value) => `${Number(value).toFixed(2)} €`} />
            <Legend formatter={(value) => legendLabel(String(value))} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
