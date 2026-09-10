# Domaine CRM — Relation client

Clients, pipeline de vente et satisfaction. Tout s'importe depuis `@/features/crm`.

**Sources** : DummyJSON (clients, paniers), JSON Server (pipeline, opportunités), JSONPlaceholder (avis).

---

## Clients

### `useClients(filters?)`

Liste paginée. La recherche est déjà temporisée — n'ajoute pas de `useDebounce` par-dessus.

```tsx
const { data, isLoading, isError, error, refetch, isFetching, totalPages } =
  useClients({ page: 1, pageSize: 10, search: 'emily' });
```

**`data` n'est pas un tableau** — c'est un objet paginé :

```ts
{ items: Client[], total: number, page: number, pageSize: number }
```

Donc `data.items.map(...)`, pas `data.map(...)`.

`isFetching` vaut `true` pendant le chargement d'une nouvelle page alors que l'ancienne reste affichée. Utile pour un voile discret plutôt qu'un spinner qui vide la liste.

### `useClient(id)`

Fiche complète. Retourne un `ClientDetail`, soit un `Client` plus `purchases: Purchase[]`.

Passe `undefined` tant que l'identifiant n'est pas connu : la requête ne partira pas.

### `useUpdateClientStatus()`

```tsx
const { mutate, isPending } = useUpdateClientStatus();
mutate({ clientId: 12, status: 'Active', notes: 'Relance faite' });
```

Statuts possibles : `'Lead' | 'Active' | 'Inactive' | 'Churned'`.

Le **segment** (`'Enterprise' | 'MidMarket' | 'Small' | 'Individual'`) est calculé depuis le volume d'achats — il n'est pas modifiable, ne prévois pas de champ de saisie.

---

## Pipeline de vente

### `usePipelineStages()`

Les six étapes, déjà triées dans l'ordre d'affichage du kanban. Chaque étape porte un `label` à afficher et une `probability`.

### `useOpportunities(stageId?)`

Sans argument, toutes les opportunités. Avec, celles d'une seule colonne.

Pour un kanban, charge tout une fois et utilise `groupByStage` :

```tsx
const { data: opportunities } = useOpportunities();
const { data: stages } = usePipelineStages();

const columns = groupByStage(opportunities ?? [], stages ?? []);
// [{ stage, items, total }, ...] — total = somme des montants de la colonne
```

### `useUpdateOpportunity()` — déplacement dans le kanban

```tsx
const { mutate } = useUpdateOpportunity();
mutate({ id: 3, stageId: 'negociation' });
```

La carte bouge **immédiatement**, sans attendre le serveur, et revient à sa place s'il refuse. Tu n'as rien à gérer côté état local.

### `canMoveTo(from, to)` — à vérifier avant le dépôt

Toutes les transitions ne sont pas permises : une affaire avance d'un cran, peut être close à tout moment, mais ne repart jamais d'une étape gagnée ou perdue.

```tsx
if (!canMoveTo(opportunity.stageId, targetStage)) return; // dépôt refusé
mutate({ id: opportunity.id, stageId: targetStage });
```

`getAllowedTransitions(from)` donne la liste — pratique pour griser les colonnes interdites pendant le glissement.

### `usePipelineObserver(options?)` — mises à jour en direct

```tsx
usePipelineObserver({
  stageChangesOnly: true,
  onEvent: (e) => notifySuccess(`${e.opportunity?.title} → ${e.toStage}`),
});
```

Appelé à chaque changement d'étape, quelle qu'en soit l'origine. `history` contient les 20 derniers événements si tu veux un fil d'activité.

### Autres

`useCreateOpportunity()`, `useDeleteOpportunity()`, `useAssignOpportunity()` — même forme de retour. Les commerciaux assignables sont dans `SALES_REPS`.

Indicateurs disponibles : `getWeightedPipelineValue(opportunities, stages)` et `getWinRate(opportunities)`.

---

## Satisfaction

### `useFeedback(clientId?)` et `useNps(clientId?)`

```tsx
const { data, averageScore, distribution } = useNps();
// data: { score, promoters, passives, detractors, total }
// distribution: [{ score: 0, count: 2 }, ... jusqu'à 10] — prêt pour un histogramme
```

Sans argument, le NPS global. Avec un `clientId`, celui d'un seul client.

**Pas de mutation** : JSONPlaceholder est en lecture seule, ne prévois pas de formulaire d'ajout d'avis.

---

## Pièges à connaître

| Piège | À faire |
|---|---|
| `useClients().data` n'est pas un tableau | `data.items` |
| Ajouter un debounce sur la recherche | déjà fait dans le hook |
| Autoriser tous les dépôts du kanban | vérifier `canMoveTo` |
| Prévoir un champ de saisie du segment | il est calculé |
| Prévoir un formulaire d'avis client | source en lecture seule |