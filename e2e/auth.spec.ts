// Scénario 1 — Flux d'authentification complet
// Inscription, déconnexion, connexion, accès refusé à une page protégée avant connexion

import { test, expect } from '@playwright/test';
import { login, REQRES_EMAIL, REQRES_REGISTER_PASSWORD } from './utils';

test.describe('Authentification', () => {
  test('accès refusé à une page protégée avant connexion', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login/);
  });

  test('inscription, déconnexion puis reconnexion', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Prénom').fill('Test');
    await page.getByLabel('Nom').fill('E2E');
    await page.getByLabel('Email').fill(REQRES_EMAIL);
    await page.getByLabel('Mot de passe', { exact: true }).fill(REQRES_REGISTER_PASSWORD);
    await page.getByLabel('Confirmer le mot de passe').fill(REQRES_REGISTER_PASSWORD);
    await page.getByRole('button', { name: "S'inscrire" }).click();

    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login/);

    await login(page);
  });
});