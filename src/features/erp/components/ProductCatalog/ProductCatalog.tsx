import { useState } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useProductCategories, useProducts } from '../../hooks/useProducts';
import { ProductDetail } from '../ProductDetail/ProductDetail.tsx';
import type { StockLevel } from '../../types';
import styles from './ProductCatalog.module.css';

const STOCK_LABELS: Record<StockLevel, string> = {
  'in-stock': 'En stock',
  'low-stock': 'Stock faible',
  'out-of-stock': 'Rupture',
};

export function ProductCatalog() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [brandFilter, setBrandFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const { data: categories } = useProductCategories();

  // Le debounce de la recherche est déjà géré à l'intérieur de useProducts
  const { data, isLoading, isFetching, isError, error, totalPages } = useProducts({
    search,
    category: category || undefined,
    page,
  });

  // ProductFilters ne supporte ni marque ni fourchette de prix côté serveur : filtre client,
  // limité à la page actuellement affichée (pas une recherche globale sur tout le catalogue).
  const visibleProducts = data?.items.filter((product) => {
    if (brandFilter && !product.brand.toLowerCase().includes(brandFilter.toLowerCase())) {
      return false;
    }
    if (minPrice && product.finalPrice < Number(minPrice)) return false;
    if (maxPrice && product.finalPrice > Number(maxPrice)) return false;
    return true;
  });

  return (
    <div className={styles.layout}>
      <div className={styles.listColumn}>
        <div className={styles.filters}>
          <input
            type="search"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className={styles.searchInput}
            aria-label="Rechercher un produit"
          />

          <select
            className={styles.select}
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            aria-label="Filtrer par catégorie"
          >
            <option value="">Toutes catégories</option>
            {categories?.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Marque..."
            value={brandFilter}
            onChange={(event) => setBrandFilter(event.target.value)}
            className={styles.input}
            aria-label="Filtrer par marque"
          />

          <div className={styles.priceRange}>
            <input
              type="number"
              placeholder="Prix min"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              className={styles.priceInput}
              aria-label="Prix minimum"
            />
            <input
              type="number"
              placeholder="Prix max"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              className={styles.priceInput}
              aria-label="Prix maximum"
            />
          </div>
        </div>

        {isLoading && <Spinner label="Chargement du catalogue..." />}

        {isError && (
          <p role="alert" className={styles.error}>
            {error?.message ?? 'Impossible de charger les produits.'}
          </p>
        )}

        {!isLoading && !isError && (
          <>
            <div className={styles.grid}>
              {visibleProducts?.length === 0 && (
                <p className={styles.empty}>Aucun produit ne correspond à ces critères.</p>
              )}
              {visibleProducts?.map((product) => (
                <Card
                  key={product.id}
                  className={styles.card}
                  onClick={() => setSelectedProductId(product.id)}
                >
                  <img src={product.thumbnail} alt="" className={styles.thumbnail} />
                  <p className={styles.name}>{product.name}</p>
                  <span className={styles.category}>{product.category}</span>
                  <div className={styles.priceRow}>
                    {product.discountPercentage > 0 && (
                      <span className={styles.oldPrice}>{product.price.toFixed(2)} €</span>
                    )}
                    <span className={styles.price}>{product.finalPrice.toFixed(2)} €</span>
                  </div>
                  <span className={`${styles.stockBadge} ${styles[product.stockLevel]}`}>
                    {STOCK_LABELS[product.stockLevel]}
                  </span>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Précédent
                </Button>
                <span className={styles.pageInfo}>
                  Page {page} / {totalPages}
                  {isFetching ? '…' : ''}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.detailColumn}>
        {selectedProductId ? (
          <ProductDetail productId={selectedProductId} />
        ) : (
          <Card className={styles.placeholder}>
            <p>Sélectionne un produit pour voir sa fiche.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
