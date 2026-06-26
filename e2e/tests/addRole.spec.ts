// e2e/tests/addRole.spec.ts

import { test, expect } from '@playwright/test';
import { AddRolePage } from '../pages/addRolePage';
import { TopMenuBarComponent } from '../pages/topMenuBarComponent';
import { RoleDetailPage } from '../pages/roleDetailPage';
import { baseRole } from '../fixtures/roles';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Static smoke test of Add Role page', async ({ page }) => {
  const addRolePage = new AddRolePage(page);

  await test.step('Arrange: Navigate to Add Roles Page', async () => {
    await addRolePage.goto();
  });

  await test.step('Assert: Confirm static UI elements on initial page load', async () => {
    // Expect all required form fields to be present
    await expect(addRolePage.heading).toBeVisible();
    await expect(addRolePage.companyNameField).toBeVisible();
    await expect(addRolePage.jobTitleField).toBeVisible();
    await expect(addRolePage.postingUrlField).toBeVisible();
    await expect(addRolePage.roleStatusSelect).toBeVisible();
    await expect(addRolePage.jobDescriptionField).toBeVisible();

    // Expect optional form fields to be present
    await expect(addRolePage.salaryMinimumField).toBeVisible();
    await expect(addRolePage.salaryMaximumField).toBeVisible();
    await expect(addRolePage.notesField).toBeVisible();

    // Expect the submit and cancel controls to be present
    await expect(addRolePage.addRoleButton).toBeVisible();
    await expect(addRolePage.cancelLink).toBeVisible();

    // Expect the top menu bar to be present
    await expect(addRolePage.topMenuBar.rolesLink).toBeVisible();
    await expect(addRolePage.topMenuBar.addLink).toBeVisible();
    await expect(addRolePage.topMenuBar.queryLink).toBeVisible();
    await expect(addRolePage.topMenuBar.adminMenuButton).toBeVisible();
  });
});

test('Basic Roles can successfully be created', async ({ page }) => {
  const addRolePage = new AddRolePage(page);
  const roleDetailPage = new RoleDetailPage(page);

  await test.step('Arrange: Navigate to Add Roles Page', async () => {
    await addRolePage.goto();
    await expect(addRolePage.heading).toBeVisible();
  });

  await test.step('Arrange: Populate values', async () => {
    await addRolePage.populateFieldsAndAddRole(baseRole);
  });

  await test.step('Act: Submit Role', async () => {
    await addRolePage.addRoleButton.click();
  });

  await test.step('Assert: Confirm user is navigated to Role Details page', async () => {
    await expect(roleDetailPage.backNavigationLink).toBeVisible();
    await expect(roleDetailPage.companyNameHeading).toBeVisible();
    await expect(roleDetailPage.roleNameText).toBeVisible();
    await expect(roleDetailPage.roleStatusBadge).toBeVisible();
  });

  await test.step('Assert: Confirm Entered Details are correctly displayed on the page', async () => {
    await expect(roleDetailPage.companyNameHeading).toHaveText(baseRole.company);
    await expect(roleDetailPage.roleNameText).toHaveText(baseRole.title);
    await expect(roleDetailPage.urlCard.getByText(baseRole.url)).toBeVisible();
    await expect(roleDetailPage.roleStatusBadge.getByText(baseRole.role_status)).toBeVisible();
    await expect(roleDetailPage.jobDescriptionSection.getByText(baseRole.jd)).toBeVisible();
  });
});

test('Top Menu Bar Add option takes user to Add page', async ({ page }) => {
  const topMenuBarComponent = new TopMenuBarComponent(page);
  const addRolePage = new AddRolePage(page);

  await test.step('Act: Click on Add link in Navigation Menu', async () => {
    await topMenuBarComponent.addLink.click();
  });

  await test.step('Assert: Check page redirected to Add page; Add page header appears', async () => {
    await expect(page).toHaveURL('/add');
    await expect(addRolePage.heading).toBeVisible();
  });
});
