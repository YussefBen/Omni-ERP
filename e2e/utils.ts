import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

// Le seul compte fonctionnel pour l'appli
export const REQRES_EMAIL = 'eve.holt@reqres.in';
export const REQRES_LOGIN_PASSWORD = 'cityslicka';
export const REQRES_REGISTER_PASSWORD = 'pistol';

// Connexion via le formulaire, jusqu'au dashboard
export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(REQRES_EMAIL);
  await page.getByLabel('Mot de passe').fill(REQRES_LOGIN_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function setRole(page: Page, role: 'admin' | 'manager' | 'user'): Promise<void> {
  await page.getByLabel('Changer de rôle').selectOption(role);
}

export async function dragAndDrop(page: Page, source: Locator, target: Locator): Promise<void> {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

  await source.dispatchEvent('dragstart', { dataTransfer });
  await target.dispatchEvent('dragenter', { dataTransfer });
  await target.dispatchEvent('dragover', { dataTransfer });
  await target.dispatchEvent('drop', { dataTransfer });
  await source.dispatchEvent('dragend', { dataTransfer });
}