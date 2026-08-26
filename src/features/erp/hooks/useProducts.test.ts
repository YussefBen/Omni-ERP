import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/test/queryWrapper';
import {
  useProduct,
  useProductCatalog,
  useProductCategories,
  useProducts,
} from './useProducts';

const wrapper = createWrapper;

describe('useProducts', () => {
  it('charge le catalogue paginé', async () => {
    const { result } = renderHook(() => useProducts(), { wrapper: wrapper() });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.items).toHaveLength(3);
    expect(result.current.data?.total).toBe(3);
  });

  it('normalise les produits', async () => {
    const { result } = renderHook(() => useProducts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const mascara = result.current.data?.items[0];

    expect(mascara?.name).toBe('Mascara Essence');
    // 100 € avec 10 % de remise
    expect(mascara?.finalPrice).toBe(90);
  });

  // Le niveau de stock est calculé à partir du seuil de réapprovisionnement,
  // pas repris tel quel de l'API.
  it('déduit le niveau de stock du seuil de réapprovisionnement', async () => {
    const { result } = renderHook(() => useProducts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const items = result.current.data?.items ?? [];

    // stock 5, seuil 20
    expect(items.find((p) => p.id === 101)?.stockLevel).toBe('low-stock');
    // stock 120, seuil 5
    expect(items.find((p) => p.id === 102)?.stockLevel).toBe('in-stock');
    // stock 0
    expect(items.find((p) => p.id === 103)?.stockLevel).toBe('out-of-stock');
  });

  it('filtre par catégorie', async () => {
    const { result } = renderHook(() => useProducts({ category: 'smartphones' }), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.items).toHaveLength(2);
    expect(
      result.current.data?.items.every((p) => p.category === 'smartphones'),
    ).toBe(true);
  });

  it('recherche par nom après temporisation', async () => {
    const { result } = renderHook(() => useProducts({ search: 'casque' }), {
      wrapper: wrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.data?.items).toHaveLength(1);
      },
      { timeout: 2000 },
    );

    expect(result.current.data?.items[0].name).toBe('Casque audio');
  });

  it('signale une erreur réseau', async () => {
    server.use(
      http.get(
        'https://dummyjson.com/products',
        () => new HttpResponse(null, { status: 503 }),
      ),
    );

    const { result } = renderHook(() => useProducts(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useProduct', () => {
  it('n\'émet aucune requête sans identifiant', () => {
    const { result } = renderHook(() => useProduct(undefined), { wrapper: wrapper() });
    expect(result.current.isLoading).toBe(false);
  });

  it('charge la fiche d\'un produit', async () => {
    const { result } = renderHook(() => useProduct(102), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.name).toBe('Téléphone X');
    expect(result.current.data?.sku).toBe('SMA-001');
  });
});

describe('useProductCategories', () => {
  it('charge la liste des catégories', async () => {
    const { result } = renderHook(() => useProductCategories(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toEqual(['beauty', 'smartphones', 'laptops']);
  });
});

describe('useProductCatalog', () => {
  // Ce hook charge tout le référentiel : il alimente les calculs qui portent
  // sur l'ensemble du catalogue, jamais l'affichage d'une liste.
  it('charge le catalogue complet sans pagination', async () => {
    const { result } = renderHook(() => useProductCatalog(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(3);
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});