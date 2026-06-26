// e2e/tests/roleDetail.spec.ts

import { test, expect } from '@playwright/test';
import { RoleDetailPage } from '../pages/roleDetailPage';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Static smoke test of Role Detail page', async ({ page }) => {
  const roleDetailPage = new RoleDetailPage(page);

  await test.step('Arrange: Navigate to Roles Details Page', async () => {
    await roleDetailPage.goto(1);
  });

  await test.step('Assert: Confirm static UI elements on initial page load', async () => {
    // Expect the top bar and options to be present
    await expect(roleDetailPage.backNavigationLink).toBeVisible();
    await expect(roleDetailPage.exportButton).toBeVisible();
    await expect(roleDetailPage.deleteButton).toBeVisible();

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

    // Expect the top menu bar to be present
    await expect(roleDetailPage.topMenuBar.rolesLink).toBeVisible();
    await expect(roleDetailPage.topMenuBar.addLink).toBeVisible();
    await expect(roleDetailPage.topMenuBar.queryLink).toBeVisible();
    await expect(roleDetailPage.topMenuBar.adminMenuButton).toBeVisible();
  });
});
