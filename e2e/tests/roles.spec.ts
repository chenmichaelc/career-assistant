// e2e/tests/roles.spec.ts

import { test, expect } from '@playwright/test';
import { RolesPage } from '../pages/rolesPage';
import { TopMenuBarComponent } from '../pages/topMenuBarComponent';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Static smoke test of Default Page on Index', async ({ page }) => {
  const indexPage = new RolesPage(page);

  // Expect "Career Assistant" to be the page title
  await expect(page).toHaveTitle(/Career Assistant/);

  // Expect "Career Assistant" to be the page title
  await expect(page.getByText('career-assistant')).toBeVisible();

  // Expect all top menu items to appear on the index page
  await expect(indexPage.topMenuBar.rolesLink).toBeVisible();
  await expect(indexPage.topMenuBar.addLink).toBeVisible();
  await expect(indexPage.topMenuBar.queryLink).toBeVisible();
  await expect(indexPage.topMenuBar.backupButton).toBeVisible();

  // Expect key elements of Roles table header to appear on the index page
  await expect(indexPage.rolesTableHeading).toBeVisible();
  await expect(indexPage.searchButton).toBeVisible();
});

test('Top Menu Bar Query option takes user to Roles page', async ({ page }) => {
  const topMenuBarComponent = new TopMenuBarComponent(page);
  await topMenuBarComponent.rolesLink.click();
  await expect(page).toHaveURL('/');
});
