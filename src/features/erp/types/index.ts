// Types du domaine ERP : produits et commandes (DummyJSON),
// fournisseurs et mouvements de stock (JSON Server).

/* ---------- Réponses brutes de DummyJSON ---------- */

// Forme renvoyée par GET /products — on ne déclare que les champs exploités.
export interface DummyJsonProduct {
  id: number;
  title: string;
  description: string;
  category: string;
  brand?: string;
  sku: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  minimumOrderQuantity: number;
  availabilityStatus: string;
  weight: number;
  thumbnail: string;
}

export interface DummyJsonCartProduct {
  id: number;
  title: string;
  price: number;
  quantity: number;
  total: number;
  discountedTotal: number;
  thumbnail: string;
}

// Forme renvoyée par GET /carts — sert de source pour les commandes.
export interface DummyJsonCart {
  id: number;
  userId: number;
  products: DummyJsonCartProduct[];
  total: number;
  discountedTotal: number;
  totalProducts: number;
  totalQuantity: number;
}

export interface DummyJsonList<T> {
  products?: T[];
  carts?: T[];
  total: number;
  skip: number;
  limit: number;
}

/* ---------- Produits ---------- */

export type StockLevel = 'in-stock' | 'low-stock' | 'out-of-stock';

// Produit normalisé, exposé aux hooks et aux écrans.
export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  brand: string;
  sku: string;
  price: number;
  discountPercentage: number;
  // Prix effectivement facturé, remise appliquée.
  finalPrice: number;
  rating: number;
  stock: number;
  // Seuil de réapprovisionnement : sous cette quantité, une commande
  // fournisseur ne peut plus être honorée.
  reorderPoint: number;
  stockLevel: StockLevel;
  thumbnail: string;
  weight: number;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

// Produit sous son seuil, avec la quantité à commander pour revenir au niveau.
export interface LowStockAlert {
  product: Product;
  severity: 'critique' | 'faible';
  missingQuantity: number;
}

/* ---------- Commandes ---------- */

export type OrderStatus =
  | 'brouillon'
  | 'confirmee'
  | 'preparation'
  | 'expediee'
  | 'livree'
  | 'annulee';

export interface OrderLine {
  productId: number;
  title: string;
  unitPrice: number;
  quantity: number;
  total: number;
  discountedTotal: number;
  thumbnail: string;
}

// Métadonnées persistées dans db.json (collection orders).
// DummyJSON ne fournit ni statut ni date sur ses paniers.
export interface OrderMeta {
  id: number;
  orderId: number;
  status: OrderStatus;
  placedAt: string;
  updatedAt: string;
}

// Commande complète : lignes DummyJSON jointes aux métadonnées locales.
export interface Order {
  id: number;
  clientId: number;
  lines: OrderLine[];
  itemCount: number;
  totalAmount: number;
  discountedAmount: number;
  status: OrderStatus;
  placedAt: string;
  updatedAt: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  clientId?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedOrders {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UpdateOrderStatusPayload {
  orderId: number;
  status: OrderStatus;
}

/* ---------- Fournisseurs ---------- */

export interface SupplierEvaluation {
  id: number;
  // Note de 1 à 5.
  score: number;
  comment?: string;
  createdAt: string;
}

// Enregistrement brut de la collection suppliers de db.json.
export interface SupplierRecord {
  id: number;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  // Catégories de produits fournies, rattachées aux catégories DummyJSON.
  categories: string[];
  // Délai de livraison en jours.
  leadTimeDays: number;
  evaluations: SupplierEvaluation[];
}

// Fournisseur exposé aux écrans : la note moyenne est recalculée à la lecture
// plutôt que stockée, pour éviter toute divergence avec les évaluations.
export interface Supplier extends SupplierRecord {
  rating: number;
  evaluationCount: number;
}

export interface EvaluateSupplierPayload {
  supplierId: number;
  score: number;
  comment?: string;
}

/* ---------- Mouvements de stock ---------- */

export type StockMovementType = 'entree' | 'sortie' | 'ajustement';

// Mouvement persisté dans db.json (collection stockMovements).
export interface StockMovement {
  id: number;
  productId: number;
  type: StockMovementType;
  // Toujours positive : le sens est porté par le type.
  quantity: number;
  reason: string;
  // Commande à l'origine du mouvement, le cas échéant.
  orderId?: number;
  occurredAt: string;
}

export type CreateStockMovementPayload = Omit<StockMovement, 'id' | 'occurredAt'>;

// Taux de rotation des stocks, réutilisé comme indicateur en BI.
export interface StockRotation {
  // Quantité totale sortie sur la période.
  unitsOut: number;
  // Stock moyen constaté.
  averageStock: number;
  // Nombre de fois que le stock a été renouvelé.
  turnoverRate: number;
  // Durée moyenne d'écoulement, en jours.
  daysOfInventory: number;
}