import { ProductCatalog } from '@/features/erp/components/ProductCatalog/ProductCatalog';
import styles from './ProductsPage.module.css';

export function ProductsPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Produits</h1>
      <ProductCatalog />
    </div>
  );
}
