# Domaine ERP — Ressources d'entreprise

Produits, commandes, fournisseurs et stocks. Tout s'importe depuis `@/features/erp`.

**Sources** : DummyJSON (194 produits, 50 commandes), JSON Server (fournisseurs, mouvements de stock).

---

## Catalogue produits

### `useProducts(filters?)`

```tsx
const { data, isLoading, isFetching, totalPages } =
  useProducts({ page: 1, search: 'laptop', category: 'smartphones' });
```

**`data` est un objet paginé**, comme pour les clients :

```ts
{ items: Product[], total: number, page: number, pageSize: number }
```

La recherche est déjà temporisée. Si `search` et `category` sont fournis ensemble, la recherche l'emporte — l'API ne sait pas combiner les deux.

### `useProductCategories()`

Les 24 catégories, chargées une fois pour toutes. À brancher sur ton composant `Select` pour le filtre.

### `useProduct(id)`

Fiche produit. Passe `undefined` tant que l'identifiant n'est pas connu.

### `useProductCatalog()` — attention à l'usage

Charge les **194 produits d'un coup**. Réservé aux calculs qui portent sur tout le référentiel — les alertes de stock l'utilisent en interne.

**Ne t'en sers pas pour afficher une liste**, `useProducts` est fait pour ça.

### Champs utiles de `Product`

```ts
{
  id, name, description, category, brand, sku,
  price,            // prix catalogue
  finalPrice,       // prix remise appliquée — c'est celui à afficher
  discountPercentage,
  rating, stock,
  reorderPoint,     // seuil de réapprovisionnement
  stockLevel,       // 'in-stock' | 'low-stock' | 'out-of-stock'
  thumbnail, weight
}
```

`stockLevel` est déjà calculé — utilise-le pour la pastille de couleur plutôt que de comparer `stock` toi-même.

---

## Commandes

### `useOrders(filters?)` et `useOrder(id)`

```tsx
const { data, totalPages } = useOrders({ page: 1, status: 'livree', clientId: 5 });
// data.items: Order[]
```

Statuts : `'brouillon' | 'confirmee' | 'preparation' | 'expediee' | 'livree' | 'annulee'`.
Les commandes les plus récentes viennent en premier.

### `useUpdateOrderStatus()` — lis ceci avant de l'utiliser

**Passe l'objet `order` complet**, pas seulement l'identifiant :

```tsx
const { mutate } = useUpdateOrderStatus();

mutate({ orderId: order.id, status: 'preparation', order });
//                                                  ^^^^^ indispensable
```

Sans lui, le statut change mais **les mouvements de stock ne sont pas générés**. Or c'est tout l'intérêt : passer en préparation crée les sorties de stock des lignes commandées, annuler les compense en entrée.

### `canChangeOrderStatus(from, to)`

Même principe que le pipeline CRM : une commande livrée ou annulée est terminale.

```tsx
const options = getAllowedOrderTransitions(order.status);
// affiche uniquement ces statuts dans ton menu déroulant
```

### `Order`

```ts
{
  id, clientId,
  lines: OrderLine[],   // productId, title, unitPrice, quantity, total, thumbnail
  itemCount,
  totalAmount,          // avant remise
  discountedAmount,     // facturé — c'est celui à afficher
  status, placedAt, updatedAt
}
```

---

## Fournisseurs

### `useSuppliers()` et `useSupplier(id)`

`rating` est la moyenne des évaluations, recalculée à la lecture. `evaluationCount` donne le nombre d'avis, `leadTimeDays` le délai de livraison.

### `useEvaluateSupplier()`

```tsx
const { mutate, isPending } = useEvaluateSupplier();
mutate({ supplierId: 3, score: 4, comment: 'Livraison conforme' });
```

Note de **1 à 5** (et non 0 à 10 comme le NPS).

### Rattachement aux produits

Le lien fournisseur–produit n'existe pas dans l'API : il se déduit des catégories.

```tsx
// Produits d'un fournisseur, sur sa fiche
const products = getSupplierProducts(supplier, catalog);

// Fournisseurs capables de réapprovisionner un produit,
// les mieux notés d'abord puis les plus rapides
const suppliers = getSuppliersForProduct(product, allSuppliers);
```

Le second est utile sur une alerte de stock : proposer directement chez qui commander.

---

## Stocks

### `useLowStockAlerts()`

```tsx
const { data, criticalCount, totalValue } = useLowStockAlerts();
// data: [{ product, severity: 'critique' | 'faible', missingQuantity }]
```

Déjà trié : les ruptures d'abord, puis par quantité manquante décroissante. `totalValue` donne le coût du réassort complet.

### `useStockMovements(productId?)`

Historique du plus récent au plus ancien. Types : `'entree' | 'sortie' | 'ajustement'`. La `quantity` est toujours positive, le sens est porté par le `type`.

### `useCreateStockMovement()`

Pour une saisie manuelle — réception fournisseur, casse, inventaire. Les mouvements liés aux commandes sont générés automatiquement.

### `useStockRotation(productId?)`

```tsx
const { data, topMoving } = useStockRotation();
// data: { unitsOut, averageStock, turnoverRate, daysOfInventory }
// topMoving: les 5 produits les plus mouvementés
```

---

## Pièges à connaître

| Piège | À faire |
|---|---|
| `useProducts().data` n'est pas un tableau | `data.items` |
| `useUpdateOrderStatus` sans l'objet `order` | passer `order` complet |
| Afficher `price` au lieu de `finalPrice` | `finalPrice` est le prix remisé |
| `useProductCatalog` pour une liste | utiliser `useProducts` |
| Note fournisseur sur 10 | l'échelle est de 1 à 5 |
| Proposer tous les statuts de commande | filtrer avec `getAllowedOrderTransitions` |