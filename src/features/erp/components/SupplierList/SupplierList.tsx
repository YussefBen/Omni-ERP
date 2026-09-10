import { useState } from 'react';
import { Button } from '@/shared/components/Button/Button';
import { Card } from '@/shared/components/Card/Card';
import { Spinner } from '@/shared/components/Spinner/Spinner';
import { useProductCatalog } from '../../hooks/useProducts';
import { getSupplierProducts, useEvaluateSupplier, useSuppliers } from '../../hooks/useSuppliers';
import type { Supplier } from '../../types';
import styles from './SupplierList.module.css';

export function SupplierList() {
  const { data: suppliers, isLoading, isError, error } = useSuppliers();
  // Catalogue complet, pas la liste paginée : nécessaire pour rattacher les produits
  // d'un fournisseur par catégorie (voir getSupplierProducts).
  const { data: products } = useProductCatalog();
  const { mutate: evaluate, isPending: isEvaluating } = useEvaluateSupplier();

  const [openEvaluationId, setOpenEvaluationId] = useState<number | null>(null);
  const [scoreDraft, setScoreDraft] = useState(5);
  const [commentDraft, setCommentDraft] = useState('');

  if (isLoading) return <Spinner label="Chargement des fournisseurs..." />;

  if (isError) {
    return (
      <p role="alert" className={styles.error}>
        {error?.message ?? 'Impossible de charger les fournisseurs.'}
      </p>
    );
  }

  function openEvaluation(supplier: Supplier) {
    setOpenEvaluationId(supplier.id);
    setScoreDraft(5);
    setCommentDraft('');
  }

  function submitEvaluation(supplierId: number) {
    evaluate(
      { supplierId, score: scoreDraft, comment: commentDraft || undefined },
      { onSuccess: () => setOpenEvaluationId(null) },
    );
  }

  return (
    <div className={styles.grid}>
      {suppliers?.length === 0 && <p className={styles.empty}>Aucun fournisseur enregistré.</p>}

      {suppliers?.map((supplier) => {
        const associatedProducts = products ? getSupplierProducts(supplier, products) : [];

        return (
          <Card key={supplier.id} className={styles.card}>
            <div className={styles.header}>
              <h3 className={styles.name}>{supplier.name}</h3>
              <span className={styles.rating}>
                ⭐ {supplier.rating > 0 ? supplier.rating.toFixed(1) : '—'} ({supplier.evaluationCount})
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

            {openEvaluationId === supplier.id ? (
              <div className={styles.evalForm}>
                <label className={styles.label} htmlFor={`score-${supplier.id}`}>
                  Note (1 à 5)
                </label>
                <input
                  id={`score-${supplier.id}`}
                  type="number"
                  min={1}
                  max={5}
                  value={scoreDraft}
                  onChange={(event) => setScoreDraft(Number(event.target.value))}
                  className={styles.scoreInput}
                />
                <textarea
                  className={styles.commentInput}
                  rows={2}
                  placeholder="Commentaire (optionnel)"
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                />
                <div className={styles.evalActions}>
                  <Button onClick={() => submitEvaluation(supplier.id)} disabled={isEvaluating}>
                    {isEvaluating ? 'Envoi...' : 'Valider'}
                  </Button>
                  <Button variant="secondary" onClick={() => setOpenEvaluationId(null)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => openEvaluation(supplier)}>
                Évaluer
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
