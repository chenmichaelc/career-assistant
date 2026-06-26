// e2e/tests/sqlQuery.spec.ts

import { test, expect } from '@playwright/test';
import { SqlQueryPage } from '../pages/sqlQueryPage';
import { TopMenuBarComponent } from '../pages/topMenuBarComponent';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Static smoke test of SQL Query page', async ({ page }) => {
  const sqlQueryPage = new SqlQueryPage(page);

  await sqlQueryPage.goto();

  await test.step('Arrange: Navigate to Query Page', async () => {
    await sqlQueryPage.goto();
    await expect(sqlQueryPage.heading).toBeVisible();
  });

  await test.step('Assert: Confirm static UI elements on initial page load', async () => {
    // Expect the page heading to be present
    await expect(sqlQueryPage.heading).toBeVisible();

    // Expect the SQL text area and execution controls to be present
    await expect(sqlQueryPage.sqlTextarea).toBeVisible();
    await expect(sqlQueryPage.executeButton).toBeVisible();
    await expect(sqlQueryPage.clearButton).toBeVisible();

    // Expect the write mode toggle to be present and read-only by default
    await expect(sqlQueryPage.writeModeToggle).toBeVisible();
    await expect(sqlQueryPage.writeModeLabel).toBeVisible();

    // Expect the top menu bar to be present
    await expect(sqlQueryPage.topMenuBar.rolesLink).toBeVisible();
    await expect(sqlQueryPage.topMenuBar.addLink).toBeVisible();
    await expect(sqlQueryPage.topMenuBar.queryLink).toBeVisible();
    await expect(sqlQueryPage.topMenuBar.adminMenuButton).toBeVisible();
  });
});

test('Verify Write Mode UI Restrictions and Behavior', async ({ page }) => {
  const sqlQueryPage = new SqlQueryPage(page);

  await test.step('Arrange: Confirm the Query Page loads', async () => {
    await sqlQueryPage.goto();
    await expect(sqlQueryPage.heading).toBeVisible();
  });

  await test.step('Assert: Confirm UI when Write Mode is Read Only', async () => {
    await expect(sqlQueryPage.writeModeToggle).toBeVisible();
    await expect(sqlQueryPage.writeModeToggle).toHaveClass(/(.)*bg-surface(.)*/);
    await expect(sqlQueryPage.writeModeToggle).not.toHaveClass(/(.)*bg-danger(.)*/);
    await expect(sqlQueryPage.writeModeLabel).toBeVisible();
    await expect(sqlQueryPage.writeModeLabel).toHaveText('read only');
    await expect(sqlQueryPage.writeModeWarning).toBeHidden();
  });

  await test.step('Act: Enable Write Mode', async () => {
    await sqlQueryPage.toggleWriteMode();
  });

  await test.step('Assert: Confirm UI when Write Mode is Read/Write', async () => {
    await expect(sqlQueryPage.writeModeToggle).toHaveClass(/(.)*bg-danger(.)*/);
    await expect(sqlQueryPage.writeModeToggle).not.toHaveClass(/(.)*bg-surface(.)*/);
    await expect(sqlQueryPage.writeModeLabel).toHaveText('WRITE ENABLED');
    await expect(sqlQueryPage.writeModeWarning).toBeVisible();
    await expect(sqlQueryPage.writeModeWarning).toHaveText(
      '⚠ Write mode enabled. INSERT, UPDATE, DELETE, DROP, ALTER, and CREATE statements will execute against the live database.'
    );
  });
});

test('Top Menu Bar Query option takes user to Query page', async ({ page }) => {
  const topMenuBarComponent = new TopMenuBarComponent(page);
  const sqlQueryPage = new SqlQueryPage(page);

  await test.step('Act: Click on Query link in Navigation Menu', async () => {
    await topMenuBarComponent.queryLink.click();
  });

  await test.step('Assert: Check page redirected to Query page; Query page header appears', async () => {
    await expect(page).toHaveURL('/query');
    await expect(sqlQueryPage.heading).toBeVisible();
  });
});
