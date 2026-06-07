import { test, expect } from '@playwright/test';
import { RolesPage }    from '../pages/rolesPage';

test('Static smoke test of Default Page on Index', async ({ page }) => {
  const indexPage = new RolesPage(page);

  await page.goto('/');

  await expect(page).toHaveTitle(/Career Assistant/);
  await expect(page.getByText('career-assistant')).toBeVisible();

  await expect(indexPage.topMenuRolesLink).toBeVisible();
  await expect(indexPage.topMenuAddLink).toBeVisible();
  await expect(indexPage.topMenuQueryLink).toBeVisible();
  await expect(indexPage.topMenuBackupLink).toBeVisible();

  await expect(indexPage.rolesTableHeading).toBeVisible();
  await expect(indexPage.searchButton).toBeVisible();
});