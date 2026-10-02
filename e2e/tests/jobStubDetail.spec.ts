// e2e/tests/jobStubDetail.spec.ts

import { test, expect } from '@playwright/test';
import { TriageQueuePage } from '../pages/triageQueuePage';
import { JobStubDetailPage } from '../pages/jobStubDetailPage';
import { e2eStubUrl } from '../fixtures/jobStubs';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Static smoke test of Job Stub Detail page', async ({ page }, testInfo) => {
  const triageQueuePage = new TriageQueuePage(page);
  const jobStubDetailPage = new JobStubDetailPage(page);
  const url = e2eStubUrl(testInfo);

  await test.step('Arrange: Queue a stub directly via the API', async () => {
    const response = await page.request.post('/api/job-stubs', { data: { url } });
    expect(response.status()).toBe(201);
  });

  await test.step('Act: Navigate to Triage and click view on the queued stub', async () => {
    await triageQueuePage.goto();
    await triageQueuePage.viewLink(url).click();
  });

  await test.step('Assert: Confirm static UI elements on the detail page', async () => {
    await expect(jobStubDetailPage.backLink).toBeVisible();
    await expect(jobStubDetailPage.url).toHaveText(url);
    await expect(jobStubDetailPage.statusValue).toHaveText('Stubbed');
    await expect(jobStubDetailPage.rawContentSection).toBeVisible();
    await expect(jobStubDetailPage.importTextarea).toBeVisible();
    await expect(jobStubDetailPage.importButton).toBeVisible();
    await expect(jobStubDetailPage.companyInput).toBeVisible();
    await expect(jobStubDetailPage.saveFieldsButton).toBeVisible();
  });
});

test('Pasting valid JSON and importing updates the parsed fields and status', async ({
  page,
}, testInfo) => {
  const jobStubDetailPage = new JobStubDetailPage(page);
  const url = e2eStubUrl(testInfo);

  await test.step('Arrange: Queue a stub and navigate to its detail page', async () => {
    const response = await page.request.post('/api/job-stubs', { data: { url } });
    expect(response.status()).toBe(201);
    await jobStubDetailPage.goto((await response.json()).id);
  });

  await test.step('Act: Paste valid structured JSON and import', async () => {
    await jobStubDetailPage.importTextarea.fill(
      JSON.stringify({ company: '[E2E] Imported Co', title: 'Imported Title' })
    );
    await jobStubDetailPage.importButton.click();
  });

  await test.step('Assert: The parsed fields and status reflect the import', async () => {
    await expect(jobStubDetailPage.companyInput).toHaveValue('[E2E] Imported Co');
    await expect(jobStubDetailPage.titleInput).toHaveValue('Imported Title');
    await expect(jobStubDetailPage.statusValue).toHaveText('Parsed');
  });
});

test('Pasting invalid JSON shows an inline error, does not navigate away', async ({
  page,
}, testInfo) => {
  const jobStubDetailPage = new JobStubDetailPage(page);
  const url = e2eStubUrl(testInfo);

  await test.step('Arrange: Queue a stub and navigate to its detail page', async () => {
    const response = await page.request.post('/api/job-stubs', { data: { url } });
    await jobStubDetailPage.goto((await response.json()).id);
  });

  await test.step('Act: Paste unparseable text and attempt to import', async () => {
    await jobStubDetailPage.importTextarea.fill('not json');
    await jobStubDetailPage.importButton.click();
  });

  await test.step('Assert: An inline error is shown', async () => {
    await expect(jobStubDetailPage.importError).toBeVisible();
  });
});

test('Editing a parsed field and saving persists the change', async ({ page }, testInfo) => {
  const jobStubDetailPage = new JobStubDetailPage(page);
  const url = e2eStubUrl(testInfo);

  await test.step('Arrange: Queue a stub and navigate to its detail page', async () => {
    const response = await page.request.post('/api/job-stubs', { data: { url } });
    await jobStubDetailPage.goto((await response.json()).id);
  });

  await test.step('Act: Edit the company field and save', async () => {
    await jobStubDetailPage.companyInput.fill('[E2E] Manually Edited Co');
    await jobStubDetailPage.save();
  });

  await test.step('Assert: The field persists after a reload', async () => {
    await page.reload();
    await expect(jobStubDetailPage.companyInput).toHaveValue('[E2E] Manually Edited Co');
  });

  await test.step('Assert: Saving a field edit does not advance status', async () => {
    await expect(jobStubDetailPage.statusValue).toHaveText('Stubbed');
  });
});

test('Editing raw content and saving persists the change', async ({ page }, testInfo) => {
  const jobStubDetailPage = new JobStubDetailPage(page);
  const url = e2eStubUrl(testInfo);

  await test.step('Arrange: Queue a stub and navigate to its detail page', async () => {
    const response = await page.request.post('/api/job-stubs', { data: { url } });
    await jobStubDetailPage.goto((await response.json()).id);
  });

  await test.step('Act: Edit the raw content and save', async () => {
    await jobStubDetailPage.rawContentTextarea.fill('[E2E] Full posting text.');
    await jobStubDetailPage.save();
  });

  await test.step('Assert: The raw content persists after a reload', async () => {
    await page.reload();
    await expect(jobStubDetailPage.rawContentTextarea).toHaveValue('[E2E] Full posting text.');
  });

  await test.step('Assert: Saving a raw content edit does not advance status', async () => {
    await expect(jobStubDetailPage.statusValue).toHaveText('Stubbed');
  });
});

test('Adding and removing a skip reason persists the change', async ({ page }, testInfo) => {
  const jobStubDetailPage = new JobStubDetailPage(page);
  const url = e2eStubUrl(testInfo);

  await test.step('Arrange: Queue a stub and navigate to its detail page', async () => {
    const response = await page.request.post('/api/job-stubs', { data: { url } });
    await jobStubDetailPage.goto((await response.json()).id);
  });

  await test.step('Act: Add a skip reason and save', async () => {
    await expect(jobStubDetailPage.addSkipReasonSection).toBeVisible();
    await jobStubDetailPage.addSkipReasonSelect.selectOption({ index: 1 });
    await jobStubDetailPage.addSkipReasonNoteInput.fill('[E2E] note');
    await jobStubDetailPage.addSkipReasonButton.click();
    await jobStubDetailPage.save();
  });

  await test.step('Assert: The skip reason persists after a reload', async () => {
    await page.reload();
    await expect(jobStubDetailPage.skipReasonRows).toHaveCount(1);
  });

  await test.step('Act: Remove the skip reason and save', async () => {
    await jobStubDetailPage.removeSkipReasonButtons.first().click();
    await jobStubDetailPage.save();
  });

  await test.step('Assert: The skip reason is gone after a reload', async () => {
    await page.reload();
    await expect(jobStubDetailPage.skipReasonRows).toHaveCount(0);
  });
});

test('Updating status via the status control persists the change', async ({ page }, testInfo) => {
  const jobStubDetailPage = new JobStubDetailPage(page);
  const url = e2eStubUrl(testInfo);

  await test.step('Arrange: Queue a stub and navigate to its detail page', async () => {
    const response = await page.request.post('/api/job-stubs', { data: { url } });
    await jobStubDetailPage.goto((await response.json()).id);
  });

  await test.step('Act: Select a new status and update', async () => {
    await jobStubDetailPage.statusSelect.selectOption('Ready to Promote');
    await jobStubDetailPage.statusUpdateButton.click();
  });

  await test.step('Assert: The status reflects the change', async () => {
    await expect(jobStubDetailPage.statusValue).toHaveText('Ready to Promote');
  });
});
