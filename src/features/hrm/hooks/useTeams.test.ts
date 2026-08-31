import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/queryWrapper';
import { useTeams } from './useTeams';

describe('useTeams', () => {
  it('regroupe les 12 employés dans leurs équipes', async () => {
    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const totalMembers = result.current.data!.reduce((sum, t) => sum + t.memberIds.length, 0);
    expect(totalMembers).toBe(12);
  });

  it('donne un nom à chaque équipe', async () => {
    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data!.every((t) => t.name)).toBe(true);
  });

  it('ne place jamais deux fois le même employé dans une équipe', async () => {
    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const allMemberIds = result.current.data!.flatMap((t) => t.memberIds);
    expect(new Set(allMemberIds).size).toBe(allMemberIds.length);
  });
});