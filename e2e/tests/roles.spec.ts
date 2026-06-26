// e2e/tests/roles.spec.ts

import { test, expect } from '@playwright/test';
import { RolesPage } from '../pages/rolesPage';
import { TopMenuBarComponent } from '../pages/topMenuBarComponent';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Static smoke test of Default Page on Index', async ({ page }) => {
  const rolesPage = new RolesPage(page);

  // Expect "Career Assistant" to be the page title
  await expect(page).toHaveTitle(/Career Assistant/);

  // Expect "Career Assistant" to be the page title
  await expect(page.getByText('career-assistant')).toBeVisible();

  // Expect all top menu items to appear on the index page
  await expect(rolesPage.topMenuBar.rolesLink).toBeVisible();
  await expect(rolesPage.topMenuBar.addLink).toBeVisible();
  await expect(rolesPage.topMenuBar.queryLink).toBeVisible();
  await expect(rolesPage.topMenuBar.adminMenuButton).toBeVisible();

  // Expect key elements of Roles table header to appear on the index page
  await expect(rolesPage.heading).toBeVisible();
  await expect(rolesPage.searchButton).toBeVisible();
});

test('Top Menu Bar Roles option takes user to Roles page', async ({ page }) => {
  const topMenuBarComponent = new TopMenuBarComponent(page);
  const rolesPage = new RolesPage(page);

  await test.step('Act: Click on Roles link in Navigation Menu', async () => {
    await topMenuBarComponent.rolesLink.click();
  });

  await test.step('Assert: Check page redirected to Roles page; Roles page header appears', async () => {
    await expect(page).toHaveURL('/');
    await expect(rolesPage.heading).toBeVisible();
  });
});
