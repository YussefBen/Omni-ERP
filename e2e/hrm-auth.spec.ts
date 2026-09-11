// Scénario 3 — Parcours croisé RH/Auth
// Connexion en tant que Manager, validation d'une demande de congé,
// vérification du changement de statut

import { test, expect } from '@playwright/test';
import { login, setRole } from './utils';

test('un manager valide une demande de congé', async ({ page }) => {
  const start = new Date();
  start.setDate(start.getDate() + 1000 + (Date.now() % 500));
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  await login(page);
  await setRole(page, 'manager');

  await page.goto('/leave-requests');

  await page.getByRole('tab', { name: 'Ma demande' }).click();
  await page.getByLabel('Du').fill(startDate);
  await page.getByLabel('Au').fill(endDate);
  await page.getByRole('button', { name: 'Envoyer la demande' }).click();
  await expect(page.getByRole('button', { name: 'Envoi...' })).toHaveCount(0);

  await page.getByRole('tab', { name: 'Calendrier & validations' }).click();

  const pendingItem = page.locator('li', { hasText: `${startDate} → ${endDate}` });
  await expect(pendingItem).toBeVisible();

  await pendingItem.getByRole('button', { name: 'Valider' }).click();

  await expect(pendingItem).toHaveCount(0);
  await page.reload();
  await page.getByRole('tab', { name: 'Calendrier & validations' }).click();
  await expect(page.locator('li', { hasText: `${startDate} → ${endDate}` })).toHaveCount(0);
});