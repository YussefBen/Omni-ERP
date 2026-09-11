// Scénario 2 — Parcours PMS complet
// Connexion, création d'un projet, création d'une tâche, déplacement sur le
// Kanban, vérification de la progression du projet

import { test, expect } from '@playwright/test';
import { login, dragAndDrop } from './utils';

test('parcours PMS complet', async ({ page }) => {
  const projectTitle = `Projet E2E ${Date.now()}`;
  const taskTitle = `Tâche E2E ${Date.now()}`;

  await login(page);
  await page.goto('/projects');

  // Création du projet
  await page.getByRole('button', { name: '+ Nouveau projet' }).click();
  await page.getByLabel('Titre').fill(projectTitle);
  await page.getByLabel('Description').fill('Créé par le scénario E2E PMS');
  await page.getByRole('button', { name: 'Créer le projet' }).click();

  await page.getByLabel('Rechercher un projet').fill(projectTitle);
  const projectCard = page.getByText(projectTitle).first();
  await expect(projectCard).toBeVisible();
  await projectCard.click();

  await expect(page).toHaveURL(/\/projects\/\d+/);

  await page.getByRole('tab', { name: 'Kanban' }).click();

  // Création de la tâche (dans la colonne "À faire", validée par Entrée)
  await page.getByLabel('Titre de la nouvelle tâche').fill(taskTitle);
  await page.getByLabel('Titre de la nouvelle tâche').press('Enter');

  const taskCard = page.getByText(taskTitle);
  await expect(taskCard).toBeVisible();

  // Glisser la tâche de "À faire" vers "Terminé" (le titre est dans .taskTitle,
  const sourceCard = taskCard.locator('..').locator('..');
  const doneColumn = page.getByRole('heading', { name: /^Terminé/ }).locator('..');
  await dragAndDrop(page, sourceCard, doneColumn);

  await expect(doneColumn.getByText(taskTitle)).toBeVisible();

  await page.getByRole('tab', { name: "Vue d'ensemble" }).click();
  await expect(page.getByText('100% des tâches terminées')).toBeVisible();
});