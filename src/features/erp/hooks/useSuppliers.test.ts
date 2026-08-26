import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createTestQueryClient, createWrapper } from '@/test/queryWrapper';
import {
  getSupplierProducts,
  getSuppliersForProduct,
  useEvaluateSupplier,
  useSupplier,
  useSuppliers,
} from './useSuppliers';
import { toProduct, toSupplier } from './erpMappers';
import { mockProducts, mockSuppliers } from '@/shared/mocks/fixtures';

const LOCAL = 'http://localhost:3001';

describe('useSuppliers', () => {
  it('charge la liste des fournisseurs', async () => {
    const { result } = renderHook(() => useSuppliers(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('Lumis Cosmétiques');
  });

  // La note n'est pas stockée : elle est recalculée depuis les évaluations
  // à chaque lecture, ce qui écarte tout risque de divergence.
  it('calcule la note moyenne depuis les évaluations', async () => {
    const { result } = renderHook(() => useSuppliers(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const lumis = result.current.data?.find((s) => s.id === 1);

    // Notes 5 et 3
    expect(lumis?.rating).toBe(4);
    expect(lumis?.evaluationCount).toBe(2);
  });

  // Une note à zéro sur un fournisseur jamais évalué se lirait comme une
  // très mauvaise note : evaluationCount permet de distinguer les deux cas.
  it('distingue un fournisseur jamais évalué d\'un fournisseur mal noté', async () => {
    const { result } = renderHook(() => useSuppliers(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const nordtech = result.current.data?.find((s) => s.id === 2);

    expect(nordtech?.rating).toBe(0);
    expect(nordtech?.evaluationCount).toBe(0);
  });

  it('signale une erreur réseau', async () => {
    server.use(
      http.get(`${LOCAL}/suppliers`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useSuppliers(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useSupplier', () => {
  it('n\'émet aucune requête sans identifiant', () => {
    const { result } = renderHook(() => useSupplier(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('charge la fiche d\'un fournisseur', async () => {
    const { result } = renderHook(() => useSupplier(2), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.name).toBe('NordTech');
    expect(result.current.data?.leadTimeDays).toBe(21);
  });
});

describe('useEvaluateSupplier', () => {
  it('ajoute une évaluation au fournisseur', async () => {
    const client = createTestQueryClient();
    const wrapper = createWrapper(client);

    const liste = renderHook(() => useSuppliers(), { wrapper });
    const mutation = renderHook(() => useEvaluateSupplier(), { wrapper });

    await waitFor(() => expect(liste.result.current.data).toBeDefined());

    act(() => {
      mutation.result.current.mutate({
        supplierId: 2,
        score: 4,
        comment: 'Livraison conforme',
      });
    });

    await waitFor(() => expect(mutation.result.current.isPending).toBe(false));

    await waitFor(() => {
      const nordtech = liste.result.current.data?.find((s) => s.id === 2);
      expect(nordtech?.evaluationCount).toBe(1);
      expect(nordtech?.rating).toBe(4);
    });
  });

  // La moyenne doit suivre l'ajout : c'est tout l'intérêt de la recalculer
  // plutôt que de la stocker.
  it('recalcule la moyenne après un nouvel avis', async () => {
    const client = createTestQueryClient();
    const wrapper = createWrapper(client);

    const liste = renderHook(() => useSuppliers(), { wrapper });
    const mutation = renderHook(() => useEvaluateSupplier(), { wrapper });

    await waitFor(() => expect(liste.result.current.data).toBeDefined());

    act(() => {
      mutation.result.current.mutate({ supplierId: 1, score: 1 });
    });

    await waitFor(() => {
      const lumis = liste.result.current.data?.find((s) => s.id === 1);
      // Notes 5, 3 et 1
      expect(lumis?.rating).toBe(3);
      expect(lumis?.evaluationCount).toBe(3);
    });
  });

  it('assainit le commentaire avant enregistrement', async () => {
    let envoye: Record<string, unknown> | undefined;

    server.use(
      http.patch(`${LOCAL}/suppliers/:id`, async ({ params, request }) => {
        envoye = (await request.json()) as Record<string, unknown>;
        const existing = mockSuppliers.find((s) => s.id === Number(params.id));
        return HttpResponse.json({ ...existing, ...envoye });
      }),
    );

    const { result } = renderHook(() => useEvaluateSupplier(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({
        supplierId: 2,
        score: 3,
        comment: '<script>alert(1)</script>Correct',
      });
    });

    await waitFor(() => expect(envoye).toBeDefined());

    const evaluations = envoye?.evaluations as Array<{ comment?: string }>;
    expect(evaluations[evaluations.length - 1].comment).not.toContain('script');
  });

  it('signale un échec d\'enregistrement', async () => {
    server.use(
      http.patch(`${LOCAL}/suppliers/:id`, () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useEvaluateSupplier(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ supplierId: 1, score: 5 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('rattachement des fournisseurs au catalogue', () => {
  const produits = mockProducts.map(toProduct);
  const fournisseurs = mockSuppliers.map(toSupplier);

  // Le lien fournisseur-produit n'existe dans aucune API : il se déduit
  // des catégories déclarées par le fournisseur.
  it('retrouve les produits fournis par un fournisseur', () => {
    const lumis = fournisseurs.find((s) => s.id === 1);
    const fournis = getSupplierProducts(lumis!, produits);

    expect(fournis).toHaveLength(1);
    expect(fournis[0].category).toBe('beauty');
  });

  it('renvoie une liste vide pour une catégorie sans produit', () => {
    const sansCorrespondance = { ...fournisseurs[0], categories: ['vehicle'] };
    expect(getSupplierProducts(sansCorrespondance, produits)).toEqual([]);
  });

  it('retrouve les fournisseurs capables de réapprovisionner un produit', () => {
    const telephone = produits.find((p) => p.id === 102);
    const candidats = getSuppliersForProduct(telephone!, fournisseurs);

    expect(candidats).toHaveLength(1);
    expect(candidats[0].name).toBe('NordTech');
  });

  // Sur une alerte de stock, l'écran propose chez qui commander :
  // les mieux notés d'abord, puis les plus rapides.
  it('classe les fournisseurs par note puis par délai', () => {
    const rapide = { ...fournisseurs[1], id: 3, name: 'Rapide', rating: 4, leadTimeDays: 5 };
    const lent = { ...fournisseurs[1], id: 4, name: 'Lent', rating: 4, leadTimeDays: 30 };
    const excellent = { ...fournisseurs[1], id: 5, name: 'Excellent', rating: 5, leadTimeDays: 40 };

    const telephone = produits.find((p) => p.id === 102);
    const classes = getSuppliersForProduct(telephone!, [lent, rapide, excellent]);

    expect(classes.map((s) => s.name)).toEqual(['Excellent', 'Rapide', 'Lent']);
  });
});