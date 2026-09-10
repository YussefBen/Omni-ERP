import { memo, useCallback, useMemo, useState } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useProductCatalog } from '../../hooks/useProducts';
import { getSupplierProducts, useEvaluateSupplier, useSuppliers } from '../../hooks/useSuppliers';
import type { Product, Supplier } from '../../types';
import styles from './SupplierList.module.css';

const DEFAULT_SCORE = 5;

interface SupplierCardProps {
  supplier: Supplier;
  products: Product[];
  isEvaluating: boolean;
  onEvaluate: (supplierId: number, score: number, comment: string) => void;
}

/**
 * Carte d'un fournisseur, avec son formulaire d'évaluation.
 *
 * L'état du formulaire vit ici plutôt que dans la liste : sans cela,
 * chaque caractère saisi dans un commentaire rerendrait les huit cartes,
 * puisque l'état partagé du parent changerait à chaque frappe. En le
 * confinant à la carte concernée, memo protège réellement les autres.
 */
const SupplierCard = memo(function SupplierCard({
  supplier,
  products,
  isEvaluating,
  onEvaluate,
}: SupplierCardProps) {
  const [isFormOpen, setFormOpen] = useState(false);
  const [score, setScore] = useState(DEFAULT_SCORE);
  const [comment, setComment] = useState('');

  // Le rattachement se fait par catégorie : il n'existe pas de lien direct
  // entre un fournisseur et ses produits dans les données sources.
  const associatedProducts = useMemo(
    () => getSupplierProducts(supplier, products),
    [supplier, products],
  );

  const openForm = () => {
    setFormOpen(true);
    setScore(DEFAULT_SCORE);
    setComment('');
  };

  const submit = () => {
    onEvaluate(supplier.id, score, comment);
    setFormOpen(false);
  };

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.name}>{supplier.name}</h3>
        <span className={styles.rating}>
          {/* La note est recalculée à la lecture depuis les évaluations :
              un tiret distingue « jamais évalué » de « mal noté ». */}
          ⭐ {supplier.rating > 0 ? supplier.rating.toFixed(1) : '—'} (
          {supplier.evaluationCount})
        </span>
      </div>

      <p className={styles.contact}>
        {supplier.contactName} — {supplier.email}
      </p>
      <p className={styles.meta}>
        {supplier.country} — {supplier.leadTimeDays}j de délai
      </p>

      <div className={styles.categories}>
        {supplier.categories.map((category) => (
          <span key={category} className={styles.categoryBadge}>
            {category}
          </span>
        ))}
      </div>

      <p className={styles.productCount}>
        {associatedProducts.length} produit(s) associé(s) dans le catalogue
      </p>

      {isFormOpen ? (
        <div className={styles.evalForm}>
          <label className={styles.label} htmlFor={`score-${supplier.id}`}>
            Note (1 à 5)
          </label>
          <input
            id={`score-${supplier.id}`}
            type="number"
            min={1}
            max={5}
            value={score}
            onChange={(event) => setScore(Number(event.target.value))}
            className={styles.scoreInput}
          />
          <textarea
            className={styles.commentInput}
            rows={2}
            placeholder="Commentaire (optionnel)"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            aria-label={`Commentaire sur ${supplier.name}`}
          />
          <div className={styles.evalActions}>
            <Button onClick={submit} disabled={isEvaluating}>
              {isEvaluating ? 'Envoi...' : 'Valider'}
            </Button>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={openForm}>
          Évaluer
        </Button>
      )}
    </Card>
  );
});

export function SupplierList() {
  const { data: suppliers, isLoading, isError, error } = useSuppliers();
  // Catalogue complet, pas la liste paginée : nécessaire pour rattacher
  // les produits d'un fournisseur par catégorie.
  const { data: products } = useProductCatalog();
  const { mutate: evaluate, isPending: isEvaluating } = useEvaluateSupplier();

  // Référence stable : sans useCallback, une nouvelle fonction serait
  // créée à chaque rendu et memo sur les cartes n'aurait aucun effet.
  const handleEvaluate = useCallback(
    (supplierId: number, score: number, comment: string) => {
      evaluate({ supplierId, score, comment: comment || undefined });
    },
    [evaluate],
  );

  // Référence stable pour la liste vide, sinon un nouveau tableau à chaque
  // rendu invaliderait la mémorisation de toutes les cartes.
  const catalog = useMemo(() => products ?? [], [products]);

  if (isLoading) return <Spinner label="Chargement des fournisseurs..." />;

  if (isError) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Impossible de charger les fournisseurs.'}
      </p>
    );
  }

  return (
    <div className={styles.grid}>
      {suppliers?.length === 0 && (
        <p className={styles.empty}>Aucun fournisseur enregistré.</p>
      )}

      {suppliers?.map((supplier) => (
        <SupplierCard
          key={supplier.id}
          supplier={supplier}
          products={catalog}
          isEvaluating={isEvaluating}
          onEvaluate={handleEvaluate}
        />
      ))}
    </div>
  );
}