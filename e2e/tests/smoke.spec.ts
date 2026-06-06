import { test, expect } from '@playwright/test';

test('Static smoke test of Index page', async ({ page }) => {
  await page.goto('http://localhost:5173/');

  // Expect "Career Assistant" to be the page title
  await expect(page).toHaveTitle(/Career Assistant/);

  // Expect the page title to appear on the index page
  await expect(page.getByText('career-assistant')).toBeVisible();

  // Expect the Roles top menu item to appear on the index page
  await expect(page.getByRole('link', { name: 'roles' })).toBeVisible();

  // Expect the Add top menu item to appear on the index page
  await expect(page.getByRole('link', { name: 'add' })).toBeVisible();

  // Expect the Query top menu item to appear on the index page
  await expect(page.getByRole('link', { name: 'query' })).toBeVisible();

  // Expect the Backup top menu item to appear on the index page
  await expect(page.getByRole('button', { name: 'backup' })).toBeVisible();

  // Expect the Roles table header to appear on the index page
  await expect(page.getByRole('heading', { name: 'Roles' })).toBeVisible();

  // Expect the Search button to appear on the index page
  await expect(page.getByRole('button', { name: 'search' })).toBeVisible();
});