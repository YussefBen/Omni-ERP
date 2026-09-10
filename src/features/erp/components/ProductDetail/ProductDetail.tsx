import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { Tooltip } from '@/shared/components/Tooltip/Tooltip';
import { useProduct } from '../../hooks/useProducts';
import { getSuppliersForProduct, useSuppliers } from '../../hooks/useSuppliers';
import type { StockLevel } from '../../types';
import styles from './ProductDetail.module.css';

const STOCK_LABELS: Record<StockLevel, string> = {
  'in-stock': 'En stock',
  'low-stock': 'Stock faible',
  'out-of-stock': 'Rupture de stock',
};

interface ProductDetailProps {
  productId: number;
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const { data: product, isLoading, isError, error } = useProduct(productId);
  const { data: suppliers } = useSuppliers();

  if (isLoading) return <Spinner label="Chargement du produit..." />;

  if (isError || !product) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Produit introuvable.'}
      </p>
    );
  }

  const eligibleSuppliers = suppliers ? getSuppliersForProduct(product, suppliers) : [];

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <img src={product.thumbnail} alt="" className={styles.image} />
        <div>
          <h2 className={styles.name}>{product.name}</h2>
          <p className={styles.meta}>
            {product.brand} — {product.category} — SKU {product.sku}
          </p>
          <p className={styles.rating}>⭐ {product.rating.toFixed(1)}</p>
        </div>
      </div>

      <p className={styles.description}>{product.description}</p>

      <div className={styles.priceRow}>
        {product.discountPercentage > 0 && (
          <span className={styles.oldPrice}>{product.price.toFixed(2)} €</span>
        )}
        <span className={styles.price}>{product.finalPrice.toFixed(2)} €</span>
        {product.discountPercentage > 0 && (
          <span className={styles.discountBadge}>-{product.discountPercentage.toFixed(0)}%</span>
        )}
      </div>

      <div className={styles.stockRow}>
        {/* Usage du Tooltip (Étape 1) pour expliquer le seuil de réapprovisionnement */}
        <Tooltip
          content={`Seuil de réapprovisionnement : ${product.reorderPoint} unités. En dessous, une commande fournisseur ne peut plus être honorée.`}
        >
          <span className={`${styles.stockBadge} ${styles[product.stockLevel]}`}>
            {STOCK_LABELS[product.stockLevel]} ({product.stock} en stock)
          </span>
        </Tooltip>
      </div>

      {eligibleSuppliers.length > 0 && (
        <div className={styles.suppliers}>
          <h3 className={styles.suppliersTitle}>Fournisseurs pouvant réapprovisionner</h3>
          <ul className={styles.supplierList}>
            {eligibleSuppliers.map((supplier) => (
              <li key={supplier.id} className={styles.supplierItem}>
                {supplier.name} — ⭐ {supplier.rating.toFixed(1)} — {supplier.leadTimeDays}j de délai
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
