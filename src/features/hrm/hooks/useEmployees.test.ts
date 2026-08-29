import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/queryWrapper';
import { useEmployees } from './useEmployees';

describe('useEmployees', () => {
  it('fusionne Reqres (identité) et RandomUser (coordonnées)', async () => {
    const { result } = renderHook(() => useEmployees(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(12);

    const first = result.current.data?.find((e) => e.id === 1);
    expect(first?.firstName).toBe('Prenom1');
    expect(first?.phone).toBeTruthy();
    expect(first?.city).toBe('Lyon');
  });

  it('ajoute département, poste et compétences dérivés', async () => {
    const { result } = renderHook(() => useEmployees(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const employee = result.current.data?.find((e) => e.id === 1);
    expect(employee?.department).toBeTruthy();
    expect(employee?.skills.length).toBeGreaterThanOrEqual(2);
  });

  it('filtre par recherche sur le nom', async () => {
    const { result } = renderHook(() => useEmployees({ search: 'Prenom3' }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].id).toBe(3);
  });

  it('filtre par compétence requise', async () => {
    const { result } = renderHook(() => useEmployees({ skills: ['TypeScript'] }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.length).toBeGreaterThan(0);
    expect(
      result.current.data?.every((e) => e.skills.some((s) => s.name === 'TypeScript')),
    ).toBe(true);
  });

  describe('filtre availableOnly', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-08-12T10:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('exclut les employés en congé aujourd\'hui', async () => {
      const { result } = renderHook(() => useEmployees({ availableOnly: true }), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.data).toBeDefined());

      expect(result.current.data?.some((e) => e.id === 1)).toBe(false);
      expect(result.current.data).toHaveLength(11);
    });
  });
});