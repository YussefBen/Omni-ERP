import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/queryWrapper';
import { useProjects } from './useProjects';

describe('useProjects', () => {
  it('charge les projets depuis JSONPlaceholder, avec statut/échéance dérivés', async () => {
    const { result } = renderHook(() => useProjects(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.items).toHaveLength(5);
    expect(result.current.data?.total).toBe(5);

    const first = result.current.data?.items.find((p) => p.id === 1);
    expect(first?.title).toBe('Projet externe 1');
    expect(first?.status).toBeTruthy();
    expect(first?.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('pagine correctement', async () => {
    const { result } = renderHook(() => useProjects({ page: 1, pageSize: 2 }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.totalPages).toBe(3);
  });

  it('filtre par recherche sur le titre', async () => {
    const { result } = renderHook(() => useProjects({ search: 'externe 3' }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined(), { timeout: 2000 });

    expect(result.current.data?.items).toHaveLength(1);
    expect(result.current.data?.items[0].id).toBe(3);
  });
});