# Domaine BI — Intelligence d'Affaires

Indicateurs, analyses de tendance et export. Tout s'importe depuis `@/features/bi`.

---

## Indicateurs

### `useKPIs(preset?)`

```tsx
const { data, isLoading } = useKPIs('trois-mois');
// presets : 'mois-courant' | 'trois-mois' | 'six-mois'
```

Vingt indicateurs répartis en cinq groupes :

```ts
data.sales     // revenue, orderCount, averageBasket, cancellationRate
data.stock     // turnoverRate, daysOfInventory, lowStockCount, restockValue
data.crm       // pipelineValue, weightedPipelineValue, winRate, nps
data.projects  // total, active, averageProgress, overdue
data.hr        // totalEmployees, teamCount, pendingLeaveRequests, employeesOnLeaveToday
```

### Structure d'un `Kpi`

```ts
{
  label,           // libellé prêt à afficher, en français
  value,           // valeur sur la période
  previousValue,   // même durée, période précédente
  deltaPercent,    // écart, ex. -12 ou +8
  direction,       // 'hausse' | 'baisse' | 'stable'
  unit,            // 'EUR' | 'jours' | 'pourcent' | 'unites'
  lowerIsBetter    // true quand une baisse est une bonne nouvelle
}
```

### `isFavorable(kpi)` — pour la couleur

**Une hausse n'est pas toujours positive.** Ruptures de stock, retards de projet, taux d'annulation : plus c'est bas, mieux c'est.

```tsx
import { isFavorable } from '@/features/bi';

<span className={isFavorable(kpi) ? 'text-green' : 'text-red'}>
  {kpi.deltaPercent > 0 ? '+' : ''}{kpi.deltaPercent} %
</span>
```

Ne compare pas `deltaPercent > 0` toi-même, tu colorerais en rouge une baisse des retards.

`direction: 'stable'` couvre les variations inférieures à 2 % — affiche une flèche neutre plutôt que du bruit.

---

## Analyses

### `useAnalytics(monthsAhead?)`

```tsx
const { data, best, worst } = useAnalytics(3);
```

**`data.revenueOverTime`** et **`data.ordersOverTime`** — séries mensuelles, format Recharts direct :

```ts
[{ key: '2026-03', label: 'mars 2026', value: 24500 }, ...]
```

Les mois sans commande sont présents à zéro : ne les filtre pas, la courbe serait faussée.

**`data.salesByCategory`** — pour un camembert :

```ts
[{ category: 'smartphones', value: 12400, share: 32.1 }, ...]
```

Déjà trié par chiffre d'affaires décroissant.

**`data.revenueForecast`** — la prévision :

```ts
{
  points: TimeSeriesPoint[],  // mêmes clés, à concaténer à la série pour prolonger la courbe
  slope,                      // pente, en euros par mois
  confidence                  // 0 à 1
}
```

### Afficher la fiabilité de la prévision

`confidence` est actuellement faible : les ventes fluctuent sans tendance nette. Signale-le plutôt que de présenter la prévision comme une certitude.

```tsx
{data.revenueForecast.confidence < 0.5 && (
  <p className="hint">Tendance peu marquée, prévision indicative</p>
)}
```

C'est un point qui sera apprécié en soutenance : une prévision honnête vaut mieux qu'une courbe lisse trompeuse.

`best` et `worst` donnent le meilleur et le pire mois — utiles pour une phrase de commentaire sous le graphique.

---

## Export

### `useExport()`

```tsx
const { exportDashboard, exportRevenue, exportCategories, isExporting } = useExport();

<Button disabled={isExporting} onClick={() => exportDashboard(kpis, 'pdf')}>
  Exporter en PDF
</Button>
<Button disabled={isExporting} onClick={() => exportDashboard(kpis, 'csv')}>
  Exporter en CSV
</Button>
```

Passe l'objet retourné par `useKPIs()` ou `useAnalytics()`. Le téléchargement se déclenche seul, le nom du fichier porte la date, et une notification confirme.

Tout est généré côté navigateur — aucun serveur n'intervient.

---

## Pièges à connaître

| Piège | À faire |
|---|---|
| Colorer selon `deltaPercent > 0` | utiliser `isFavorable(kpi)` |
| Filtrer les mois à zéro | les garder, la courbe en dépend |
| Afficher la prévision sans nuance | tester `confidence` |
| Reconstruire les libellés d'indicateurs | `kpi.label` est déjà en français |

---

## Sources des indicateurs

`data.sales`, `data.stock` et `data.crm` sont calculés depuis les commandes, le catalogue produits et le pipeline de vente.

`data.projects` et `data.hr` viennent des domaines PMS et HRM, via `getProjectsKPI()` et `getHRKPI()`. Ces deux fonctions sont asynchrones et passent par React Query.