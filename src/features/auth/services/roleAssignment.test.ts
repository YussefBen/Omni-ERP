import { describe, expect, it } from 'vitest';
import { deriveRole } from './roleAssignment';

describe('deriveRole', () => {
  it('renvoie toujours le même rôle pour le même id', () => {
    expect(deriveRole(5)).toBe(deriveRole(5));
  });

  it('fait tourner les 3 rôles sur des ids consécutifs', () => {
    expect(deriveRole(0)).toBe('admin');
    expect(deriveRole(1)).toBe('manager');
    expect(deriveRole(2)).toBe('user');
    expect(deriveRole(3)).toBe('admin');
  });

  it('ne renvoie jamais autre chose que les 3 rôles valides', () => {
    for (let id = 0; id < 50; id++) {
      expect(['admin', 'manager', 'user']).toContain(deriveRole(id));
    }
  });
});