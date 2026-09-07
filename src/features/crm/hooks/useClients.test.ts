import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/shared/mocks/server';
import { createWrapper } from '@/test/queryWrapper';
import { useClient, useClients } from './useClients';

const wrapper = createWrapper;

describe('useClients', () => {
  it('passe de l\'état de chargement aux données', async () => {
    const { result } = renderHook(() => useClients(), { wrapper: wrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.items).toHaveLength(3);
    expect(result.current.isError).toBe(false);
  });

  it('normalise les clients depuis la réponse brute', async () => {
    const { result } = renderHook(() => useClients(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const client = result.current.data?.items[0];

    expect(client?.fullName).toBe('Emily Johnson');
    expect(client?.companyName).toBe('Dooley SA');
    expect(client?.jobTitle).toBe('Sales Manager');
  });

  // Le segment et le statut viennent de deux sources différentes : les achats
  // pour l'un, la base locale pour l'autre. Le hook doit les composer.
  it('compose le segment depuis les achats et le statut depuis la base locale', async () => {
    const { result } = renderHook(() => useClients(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const emily = result.current.data?.items.find((c) => c.id === 1);

    // 900 + 11000 dépensés, donc au-dessus du seuil Enterprise
    expect(emily?.totalSpent).toBe(11900);
    expect(emily?.orderCount).toBe(2);
    expect(emily?.segment).toBe('Enterprise');
    expect(emily?.status).toBe('Active');
  });

  it('attribue un statut par défaut aux clients jamais qualifiés', async () => {
    const { result } = renderHook(() => useClients(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    // Michael a commandé mais n'a pas de profil enregistré
    const michael = result.current.data?.items.find((c) => c.id === 2);
    expect(michael?.status).toBe('Active');
  });

  it('calcule le nombre de pages depuis le total', async () => {
    const { result } = renderHook(() => useClients({ pageSize: 2 }), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.total).toBe(3);
    expect(result.current.totalPages).toBe(2);
  });

  it('demande la bonne tranche de résultats', async () => {
    const { result } = renderHook(() => useClients({ page: 2, pageSize: 2 }), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.page).toBe(2);
    expect(result.current.data?.items).toHaveLength(1);
  });

  // La recherche est temporisée dans le hook : sans attente, la requête
  // n'est pas encore partie.
  it('bascule sur l\'endpoint de recherche après temporisation', async () => {
    const { result } = renderHook(() => useClients({ search: 'sophia' }), {
      wrapper: wrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.data?.items).toHaveLength(1);
      },
      { timeout: 2000 },
    );

    expect(result.current.data?.items[0].fullName).toBe('Sophia Brown');
  });

  it('signale une erreur réseau sans planter', async () => {
    server.use(
      http.get('https://dummyjson.com/users', () => new HttpResponse(null, { status: 500 })),
    );

    const { result } = renderHook(() => useClients(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe('useClient', () => {
  it('n\'émet aucune requête sans identifiant', () => {
    const { result } = renderHook(() => useClient(undefined), { wrapper: wrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('charge la fiche d\'un client', async () => {
    const { result } = renderHook(() => useClient(1), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.fullName).toBe('Emily Johnson');
  });

  // La fiche expose le détail des commandes, contrairement à la liste
  // qui n'en donne que le résumé.
  it('joint le détail des commandes à la fiche', async () => {
    const { result } = renderHook(() => useClient(1), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.purchases).toHaveLength(2);
    expect(result.current.data?.purchases[0].products[0].title).toBe('Produit A');
  });

  it('signale une fiche introuvable', async () => {
    const { result } = renderHook(() => useClient(999), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});