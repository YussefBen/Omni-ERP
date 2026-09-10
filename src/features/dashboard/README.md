# Domaine Dashboard — Écran d'accueil

Agrégation des indicateurs, météo et notifications. Tout s'importe depuis `@/features/dashboard`.

---

## Écran d'accueil

### `useDashboardData()`

Un seul appel pour tout l'accueil.

```tsx
const { data, isLoading } = useDashboardData();

// data.highlights: Kpi[]  — un indicateur par domaine (ventes, CRM, stocks, projets, RH)
// data.alerts: LowStockAlert[]  — les 5 plus urgents
// data.criticalAlertCount: number
// data.weather: Weather | undefined
```

La météo n'entre pas dans `isError` : son indisponibilité ne doit pas faire échouer tout l'écran.

---

## Météo

### `useWeather(city?)`

Par défaut Évry. Rafraîchissement automatique toutes les 15 minutes.

```tsx
const { data, isConfigured } = useWeather();

if (!isConfigured) return <p>Clé météo absente du fichier .env</p>;
```

**`isConfigured` vaut `false` si la clé n'est pas renseignée.** Affiche un message explicite plutôt qu'une erreur réseau — c'est le cas de tes coéquipiers tant qu'ils n'ont pas créé leur clé.

```ts
{
  city, country, description,
  iconUrl,          // image prête à l'emploi, ne construis pas l'URL toi-même
  temperature, feelsLike, humidity,
  windSpeedKmh,     // déjà converti depuis les m/s de l'API
  cloudiness, observedAt, sunrise, sunset
}
```

### `useWeatherForecast(city?)`

Cinq jours, agrégés depuis les relevés tri-horaires.

```ts
{ date, label, minTemperature, maxTemperature, description, iconUrl }
```

**Le premier jour est incomplet** — les relevés commencent à l'heure actuelle, donc sa minimale est faussée. Affiche-le comme « aujourd'hui » ou passe au jour suivant.

### Obtenir une clé

Compte gratuit sur `openweathermap.org`, onglet **API keys**, puis dans ton `.env` :

```
VITE_OPENWEATHER_API_KEY=ta_cle
```

Compte jusqu'à 2 h avant activation. Chacun a la sienne, le `.env` n'est pas versionné.

---

## Notifications

### Émettre — depuis n'importe où

Ce ne sont pas des hooks : appelables dans un `onSuccess`, un service, une fonction quelconque.

```tsx
import { notifySuccess, notifyError, notifyInfo, notifyAlert } from '@/features/dashboard';

notifySuccess('Projet créé', 'pms');
notifyError('Échec de la connexion', 'auth');
```

Le second argument est le domaine émetteur, facultatif, utile pour filtrer l'affichage.

### Afficher — `useNotifications()`

```tsx
const { notifications, unreadCount, dismiss, dismissAll, markAsRead } = useNotifications();

return notifications.map((n) => (
  <Toast key={n.id} message={n.message} variant={mapLevel(n.level)}
         onClose={() => dismiss(n.id)} />
));
```

Niveaux : `'succes' | 'erreur' | 'info' | 'alerte'`.

**Les succès disparaissent après 5 secondes, les erreurs restent** jusqu'à fermeture manuelle — elles demandent une action.

Options : `useNotifications({ maxItems: 10, autoDismissMs: 0 })` — `0` désactive le retrait automatique.

### Où placer le hook

Une seule fois, haut dans l'arbre — dans `providers.tsx` ou le layout principal. Chaque appel crée un abonnement distinct : deux composants qui l'appellent afficheront deux piles indépendantes.

---

## Pièges à connaître

| Piège | À faire |
|---|---|
| Erreur réseau affichée sans clé météo | tester `isConfigured` |
| Construire l'URL de l'icône à la main | `iconUrl` est fourni |
| Convertir le vent en km/h | `windSpeedKmh` l'est déjà |
| Afficher la minimale du premier jour de prévision | relevés incomplets |
| Appeler `useNotifications` dans plusieurs composants | une seule fois, en haut |