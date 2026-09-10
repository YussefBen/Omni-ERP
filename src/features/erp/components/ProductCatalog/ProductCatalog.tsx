import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { ALL_PRODUCTS, useProductCategories, useProducts } from '../../hooks/useProducts';
import { ProductDetail } from '../ProductDetail/ProductDetail.tsx';
import type { Product, StockLevel } from '../../types';
import styles from './ProductCatalog.module.css';

const STOCK_LABELS: Record<StockLevel, string> = {
  'in-stock': 'En stock',
  'low-stock': 'Stock faible',
  'out-of-stock': 'Rupture',
};

// Largeur minimale d'une carte et hauteur d'une rangée. La virtualisation
// a besoin de ces deux valeurs pour déterminer quelles rangées sont
// visibles sans avoir à les mesurer une par une.
const MIN_CARD_WIDTH = 190;
const ROW_HEIGHT = 250;

/**
 * Nombre de cartes par rangée, recalculé quand la fenêtre change de taille.
 *
 * La grille CSS s'adaptait seule avec `auto-fill`, mais la virtualisation
 * impose de connaître ce nombre en JavaScript : c'est lui qui détermine
 * combien de rangées contient la liste.
 */
function useColumnCount(containerRef: React.RefObject<HTMLDivElement | null>): number {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const width = element.clientWidth;
      setColumns(Math.max(1, Math.floor(width / MIN_CARD_WIDTH)));
    };

    update();

    // ResizeObserver plutôt qu'un écouteur sur window : il réagit aussi
    // quand le conteneur change de taille sans que la fenêtre bouge —
    // ouverture de la fiche produit, repli du menu latéral.
    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, [containerRef]);

  return columns;
}

interface RowData {
  products: Product[];
  columns: number;
  onSelect: (id: number) => void;
}

/**
 * Une rangée de cartes.
 *
 * memo évite de rerendre toutes les rangées visibles à chaque défilement.
 * La fonction de sélection est stabilisée par useCallback côté parent :
 * sans cela, une nouvelle fonction serait créée à chaque rendu et memo
 * n'aurait aucun effet, une propriété différente suffisant à invalider
 * la mémorisation.
 */
function ProductRowBase({
  index,
  style,
  products,
  columns,
  onSelect,
}: RowComponentProps<RowData>) {
  const start = index * columns;
  const rowProducts = products.slice(start, start + columns);

  return (
    <div
      style={{ ...style, gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      className={styles.row}
    >
      {rowProducts.map((product) => (
        <Card key={product.id} className={styles.card} onClick={() => onSelect(product.id)}>
          {/* loading="lazy" complète la virtualisation : même parmi les
              rangées rendues, une image n'est téléchargée qu'à l'approche
              de la zone visible. */}
          <img src={product.thumbnail} alt="" className={styles.thumbnail} loading="lazy" />
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
  );
}

// L'assertion conserve la signature d'origine : memo élargit le type de
// retour à ReactNode, alors que react-window attend ReactElement | null.
const ProductRow = memo(ProductRowBase) as typeof ProductRowBase;

export function ProductCatalog() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const columns = useColumnCount(gridRef);

  const { data: categories } = useProductCategories();

  // Le debounce de la recherche est déjà géré à l'intérieur de useProducts.
  const { data, isLoading, isFetching, isError, error } = useProducts({
    search,
    category: category || undefined,
    pageSize: ALL_PRODUCTS,
  });

  // useMemo évite de reparcourir les 194 produits à chaque frappe dans un
  // champ de filtre ou à chaque ouverture de fiche.
  const visibleProducts = useMemo(() => {
    const items = data?.items ?? [];
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    const brand = brandFilter.trim().toLowerCase();

    return items.filter((product) => {
      if (brand && !product.brand.toLowerCase().includes(brand)) return false;
      if (min !== null && product.finalPrice < min) return false;
      if (max !== null && product.finalPrice > max) return false;
      return true;
    });
  }, [data?.items, brandFilter, minPrice, maxPrice]);

  const handleSelect = useCallback((id: number) => setSelectedProductId(id), []);

  const rowCount = Math.ceil(visibleProducts.length / columns);

  const rowProps = useMemo<RowData>(
    () => ({ products: visibleProducts, columns, onSelect: handleSelect }),
    [visibleProducts, columns, handleSelect],
  );

  return (
    <div className={styles.layout}>
      <div className={styles.listColumn}>
        <div className={styles.filters}>
          <input
            type="search"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={styles.searchInput}
            aria-label="Rechercher un produit"
          />

          <select
            className={styles.select}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
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
            {/* Annonce le nombre de résultats aux lecteurs d'écran après
                un filtrage, information qu'une grille visuelle donne d'un
                coup d'œil mais qu'une lecture linéaire ne donne pas. */}
            <p role="status" className={styles.resultCount}>
              {visibleProducts.length} produit{visibleProducts.length > 1 ? 's' : ''}
              {isFetching ? ' — mise à jour...' : ''}
            </p>

            {/* Le conteneur sert de référence de mesure : sa largeur
                détermine le nombre de cartes par rangée. */}
            <div ref={gridRef} className={styles.gridContainer}>
              {visibleProducts.length === 0 ? (
                <p className={styles.empty}>Aucun produit ne correspond à ces critères.</p>
              ) : (
                <List
                  className={styles.virtualGrid}
                  rowComponent={ProductRow}
                  rowCount={rowCount}
                  rowHeight={ROW_HEIGHT}
                  rowProps={rowProps}
                />
              )}
            </div>
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