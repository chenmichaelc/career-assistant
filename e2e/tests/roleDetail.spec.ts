// e2e/tests/roleDetail.spec.ts

import { test, expect } from '@playwright/test';
import { RoleDetailPage } from '../pages/roleDetailPage';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Static smoke test of Role Detail page', async ({ page }) => {
  const roleDetailPage = new RoleDetailPage(page);

  // Navigate directly to a known role — assumes at least one role exists with ID 1
  await roleDetailPage.goto(1);

  // Expect the back link to be present
  await expect(roleDetailPage.backNavigationLink).toBeVisible();

  // Expect the company heading and title to be present
  await expect(roleDetailPage.companyNameHeading).toBeVisible();
  await expect(roleDetailPage.roleNameText).toBeVisible();

  // Expect the status badge to be visible
  await expect(roleDetailPage.roleStatusBadge).toBeVisible();

  // Expect the meta grid cards to be present
  await expect(roleDetailPage.candidacyCard).toBeVisible();
  await expect(roleDetailPage.appliedDateCard).toBeVisible();
  await expect(roleDetailPage.salaryCard).toBeVisible();
  await expect(roleDetailPage.urlCard).toBeVisible();

  // Expect the status update control to be present
  await expect(roleDetailPage.statusSelect).toBeVisible();
  await expect(roleDetailPage.updateStatusButton).toBeVisible();

  // Expect the export and delete action buttons to be present
  await expect(roleDetailPage.exportButton).toBeVisible();
  await expect(roleDetailPage.deleteButton).toBeVisible();

  // Expect the top menu bar to be present
  await expect(roleDetailPage.topMenuBar.rolesLink).toBeVisible();
  await expect(roleDetailPage.topMenuBar.addLink).toBeVisible();
  await expect(roleDetailPage.topMenuBar.queryLink).toBeVisible();
  await expect(roleDetailPage.topMenuBar.backupButton).toBeVisible();
});
