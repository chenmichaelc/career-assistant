import { test, expect } from '@playwright/test';
import { RolesPage }    from '../pages/rolesPage';

test('Static smoke test of Default Page on Index', async ({ page }) => {
  const indexPage = new RolesPage(page);

  await page.goto('/');

  // Expect "Career Assistant" to be the page title
  await expect(page).toHaveTitle(/Career Assistant/);

  // Expect "Career Assistant" to be the page title
  await expect(page.getByText('career-assistant')).toBeVisible();

  // Expect all top menu items to appear on the index page
  await expect(indexPage.topMenuRolesLink).toBeVisible();
  await expect(indexPage.topMenuAddLink).toBeVisible();
  await expect(indexPage.topMenuQueryLink).toBeVisible();
  await expect(indexPage.topMenuBackupLink).toBeVisible();

  // Expect key elements of Roles table header to appear on the index page
  await expect(indexPage.rolesTableHeading).toBeVisible();
  await expect(indexPage.searchButton).toBeVisible();
});