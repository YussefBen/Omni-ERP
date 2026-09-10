import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useExport } from '../../hooks/useExport';
import { useKPIs } from '../../hooks/useKPIs';
import { ProjectsEvolutionChart } from '../ProjectsEvolutionChart/ProjectsEvolutionChart.tsx';
import { SalesByCategoryChart } from '../SalesByCategoryChart/SalesByCategoryChart.tsx';
import { TeamPerformanceChart } from '../TeamPerformanceChart/TeamPerformanceChart.tsx';
import styles from './BiReports.module.css';

export function BiReports() {
  // Réutilisés ici uniquement pour savoir si les données sont prêtes à exporter ;
  // chaque graphique ci-dessous appelle aussi ces hooks, React Query dédoublonne
  // via la même clé de cache, donc pas de requête réseau supplémentaire.
  const kpis = useKPIs();
  const analytics = useAnalytics();
  const { exportDashboard, exportRevenue, exportCategories, isExporting } = useExport();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>Rapports &amp; Analytique</h1>
      </header>

      <Card className={styles.exportCard}>
        <h2 className={styles.exportTitle}>Exports</h2>
        <div className={styles.exportGroups}>
          <div className={styles.exportGroup}>
            <span className={styles.exportLabel}>Tableau de bord des indicateurs</span>
            <div className={styles.exportButtons}>
              <Button
                variant="secondary"
                disabled={isExporting || !kpis.data}
                onClick={() => kpis.data && exportDashboard(kpis.data, 'csv')}
              >
                CSV
              </Button>
              <Button
                variant="secondary"
                disabled={isExporting || !kpis.data}
                onClick={() => kpis.data && exportDashboard(kpis.data, 'pdf')}
              >
                PDF
              </Button>
            </div>
          </div>

          <div className={styles.exportGroup}>
            <span className={styles.exportLabel}>Chiffre d&apos;affaires</span>
            <div className={styles.exportButtons}>
              <Button
                variant="secondary"
                disabled={isExporting || !analytics.data}
                onClick={() => analytics.data && exportRevenue(analytics.data, 'csv')}
              >
                CSV
              </Button>
              <Button
                variant="secondary"
                disabled={isExporting || !analytics.data}
                onClick={() => analytics.data && exportRevenue(analytics.data, 'pdf')}
              >
                PDF
              </Button>
            </div>
          </div>

          <div className={styles.exportGroup}>
            <span className={styles.exportLabel}>Ventes par catégorie</span>
            <div className={styles.exportButtons}>
              <Button
                variant="secondary"
                disabled={isExporting || !analytics.data}
                onClick={() => analytics.data && exportCategories(analytics.data, 'csv')}
              >
                CSV
              </Button>
              <Button
                variant="secondary"
                disabled={isExporting || !analytics.data}
                onClick={() => analytics.data && exportCategories(analytics.data, 'pdf')}
              >
                PDF
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className={styles.grid}>
        <ProjectsEvolutionChart />
        <SalesByCategoryChart />
        <TeamPerformanceChart />
      </div>
    </div>
  );
}
