import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/queryWrapper';
import { useSkills } from './useSkills';

describe('useSkills', () => {
  it('agrège les compétences, avec un nombre d\'employés cohérent avec la liste', async () => {
    const { result } = renderHook(() => useSkills(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data!.length).toBeGreaterThan(0);
    for (const skill of result.current.data!) {
      expect(skill.employeeCount).toBe(skill.employeeIds.length);
    }
  });

  it('le total des affectations correspond à 2 ou 3 compétences par employé (12 employés)', async () => {
    const { result } = renderHook(() => useSkills(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const totalAssignments = result.current.data!.reduce((sum, s) => sum + s.employeeCount, 0);
    expect(totalAssignments).toBeGreaterThanOrEqual(24);
    expect(totalAssignments).toBeLessThanOrEqual(36);
  });
});