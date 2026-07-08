// e2e/tests/utilities.spec.ts

import { test, expect } from '@playwright/test';
import { TopMenuBarComponent } from '../pages/topMenuBarComponent';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Utilities dropdown opens and shows diff and resume-converter links', async ({ page }) => {
  const topMenuBarComponent = new TopMenuBarComponent(page);

  await test.step('Act: Open the utilities dropdown', async () => {
    await topMenuBarComponent.utilitiesMenuButton.click();
  });

  await test.step('Assert: Both utility links are visible', async () => {
    await expect(topMenuBarComponent.diffLink).toBeVisible();
    await expect(topMenuBarComponent.resumeConverterLink).toBeVisible();
  });
});

test('Utilities dropdown "diff" link navigates to the diff visualizer', async ({ page }) => {
  const topMenuBarComponent = new TopMenuBarComponent(page);

  await test.step('Act: Open utilities dropdown and click diff', async () => {
    await topMenuBarComponent.utilitiesMenuButton.click();
    await topMenuBarComponent.diffLink.click();
  });

  await test.step('Assert: Navigated to the diff visualizer route', async () => {
    await expect(page).toHaveURL('/utilities/diff');
    await expect(page.getByTestId('diff-visualizer-view')).toBeVisible();
  });
});

test('Utilities dropdown "resume → docx" link navigates to the resume converter', async ({
  page,
}) => {
  const topMenuBarComponent = new TopMenuBarComponent(page);

  await test.step('Act: Open utilities dropdown and click resume converter', async () => {
    await topMenuBarComponent.utilitiesMenuButton.click();
    await topMenuBarComponent.resumeConverterLink.click();
  });

  await test.step('Assert: Navigated to the resume converter route', async () => {
    await expect(page).toHaveURL('/utilities/resume-converter');
    await expect(page.getByTestId('resume-converter-view')).toBeVisible();
  });
});
