// e2e/tests/triageQueue.spec.ts

import { test, expect } from '@playwright/test';
import { TriageQueuePage } from '../pages/triageQueuePage';
import { TopMenuBarComponent } from '../pages/topMenuBarComponent';
import { AddRolePage } from '../pages/addRolePage';
import { RoleDetailPage } from '../pages/roleDetailPage';
import { e2eStubUrl } from '../fixtures/jobStubs';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Static smoke test of Triage page', async ({ page }) => {
  const triageQueuePage = new TriageQueuePage(page);

  await test.step('Arrange: Navigate to Triage page', async () => {
    await triageQueuePage.goto();
  });

  await test.step('Assert: Confirm static UI elements on initial page load', async () => {
    await expect(triageQueuePage.heading).toBeVisible();
    await expect(triageQueuePage.quickAddUrlField).toBeVisible();
    await expect(triageQueuePage.quickAddButton).toBeVisible();

    await expect(triageQueuePage.topMenuBar.rolesLink).toBeVisible();
    await expect(triageQueuePage.topMenuBar.addLink).toBeVisible();
    await expect(triageQueuePage.topMenuBar.triageLink).toBeVisible();
    await expect(triageQueuePage.topMenuBar.queryLink).toBeVisible();
  });
});

test('Top Menu Bar Triage option takes user to Triage page', async ({ page }) => {
  const topMenuBarComponent = new TopMenuBarComponent(page);
  const triageQueuePage = new TriageQueuePage(page);

  await test.step('Act: Click on Triage link in Navigation Menu', async () => {
    await topMenuBarComponent.triageLink.click();
  });

  await test.step('Assert: Check page redirected to Triage page; heading appears', async () => {
    await expect(page).toHaveURL('/triage');
    await expect(triageQueuePage.heading).toBeVisible();
  });
});

test('Queueing a URL via quick-add adds it to the list', async ({ page }, testInfo) => {
  const triageQueuePage = new TriageQueuePage(page);
  const url = e2eStubUrl(testInfo);

  await test.step('Arrange: Navigate to Triage page', async () => {
    await triageQueuePage.goto();
  });

  await test.step('Act: Queue a new URL via quick-add', async () => {
    await triageQueuePage.queueUrl(url);
  });

  await test.step('Assert: The queued URL appears in the list', async () => {
    await expect(triageQueuePage.stubRow(url)).toBeVisible();
  });
});

test('Quick-add rejects an invalid URL with an inline error, does not queue it', async ({
  page,
}) => {
  const triageQueuePage = new TriageQueuePage(page);

  await test.step('Arrange: Navigate to Triage page', async () => {
    await triageQueuePage.goto();
  });

  await test.step('Act: Attempt to queue an unparseable URL', async () => {
    await triageQueuePage.queueUrl('not a url');
  });

  await test.step('Assert: An inline error is shown and nothing was queued', async () => {
    await expect(triageQueuePage.errorMessage).toBeVisible();
    await expect(triageQueuePage.stubRow('not a url')).toHaveCount(0);
  });
});

test('Promoting a stub prefills Add Role, creates the role, and removes the stub from the queue', async ({
  page,
}, testInfo) => {
  const triageQueuePage = new TriageQueuePage(page);
  const addRolePage = new AddRolePage(page);
  const roleDetailPage = new RoleDetailPage(page);
  const url = e2eStubUrl(testInfo);
  const jobTitle = `Promoted Role ${testInfo.project.name} ${testInfo.testId}`;
  const companyName = '[E2E] Triage Test Co';

  await test.step('Arrange: Queue a stub directly via the API (promotion is the subject here, not queueing)', async () => {
    const response = await page.request.post('/api/job-stubs', { data: { url } });
    expect(response.status()).toBe(201);
  });

  await test.step('Act: Navigate to Triage and click promote on the queued stub', async () => {
    await triageQueuePage.goto();
    await triageQueuePage.promoteButton(url).click();
  });

  await test.step('Assert: Navigated to Add Role with the URL prefilled', async () => {
    await expect(page).toHaveURL(/\/add\?url=/);
    await expect(addRolePage.postingUrlField).toHaveValue(url);
  });

  await test.step('Act: Complete the remaining fields and submit', async () => {
    await addRolePage.companyNameField.fill(companyName);
    await addRolePage.jobTitleField.fill(jobTitle);
    await addRolePage.jobDescriptionField.fill('Promoted from a queued stub.');
    await addRolePage.addRoleButton.click();
  });

  await test.step('Assert: The role was created with the promoted URL', async () => {
    await expect(roleDetailPage.companyNameHeading).toHaveText(companyName);
    await expect(roleDetailPage.urlCard.getByText(url)).toBeVisible();
  });

  await test.step('Assert: The stub no longer appears in the Triage queue', async () => {
    await triageQueuePage.goto();
    await expect(triageQueuePage.stubRow(url)).toHaveCount(0);
  });
});

test('Deleting a stub removes it from the queue after confirmation', async ({ page }, testInfo) => {
  const triageQueuePage = new TriageQueuePage(page);
  const url = e2eStubUrl(testInfo);

  await test.step('Arrange: Queue a stub directly via the API', async () => {
    const response = await page.request.post('/api/job-stubs', { data: { url } });
    expect(response.status()).toBe(201);
  });

  await test.step('Act: Navigate to Triage and delete the stub, confirming the prompt', async () => {
    await triageQueuePage.goto();
    await triageQueuePage.deleteButton(url).click();
    await expect(triageQueuePage.confirmModal).toBeVisible();
    await triageQueuePage.confirmModalConfirmButton.click();
  });

  await test.step('Assert: The stub no longer appears in the queue', async () => {
    await expect(triageQueuePage.stubRow(url)).toHaveCount(0);
  });
});

test('Canceling the delete confirmation leaves the stub in the queue', async ({
  page,
}, testInfo) => {
  const triageQueuePage = new TriageQueuePage(page);
  const url = e2eStubUrl(testInfo);

  await test.step('Arrange: Queue a stub directly via the API', async () => {
    const response = await page.request.post('/api/job-stubs', { data: { url } });
    expect(response.status()).toBe(201);
  });

  await test.step('Act: Navigate to Triage, start deleting, then cancel', async () => {
    await triageQueuePage.goto();
    await triageQueuePage.deleteButton(url).click();
    await expect(triageQueuePage.confirmModal).toBeVisible();
    await triageQueuePage.confirmModalCancelButton.click();
  });

  await test.step('Assert: The stub still appears in the queue', async () => {
    await expect(triageQueuePage.stubRow(url)).toBeVisible();
  });
});

test('Each stub shows one stage indicator reflecting how far along it is, independent of its stored status', async ({
  page,
}, testInfo) => {
  const triageQueuePage = new TriageQueuePage(page);
  const baseUrl = e2eStubUrl(testInfo);
  const urlOnlyStubUrl = `${baseUrl}/url-only`;
  const rawContentStubUrl = `${baseUrl}/raw-content`;
  const partialStubUrl = `${baseUrl}/partial`;
  const completeStubUrl = `${baseUrl}/complete`;
  const rawContentText = '[E2E] Full posting text.';
  const partialParsedFields = { title: '[E2E] Partial Title' };
  const completeParsedFields = {
    company: '[E2E] Co',
    title: '[E2E] Title',
    description: '[E2E] Description',
  };

  async function queueStub(stubUrl: string): Promise<number> {
    const stubCreationResponse = await page.request.post('/api/job-stubs', {
      data: { url: stubUrl },
    });
    expect(stubCreationResponse.status()).toBe(201);
    return (await stubCreationResponse.json()).id;
  }

  await test.step('Arrange: Queue stubs at each stage via the API', async () => {
    await queueStub(urlOnlyStubUrl);

    const rawContentStubId = await queueStub(rawContentStubUrl);
    const rawContentUpdateResponse = await page.request.patch(
      `/api/job-stubs/${rawContentStubId}/raw-content`,
      { data: { raw_content: rawContentText } }
    );
    expect(rawContentUpdateResponse.status()).toBe(200);

    const partialStubId = await queueStub(partialStubUrl);
    const partialUpdateResponse = await page.request.patch(
      `/api/job-stubs/${partialStubId}/parsed-fields`,
      { data: partialParsedFields }
    );
    expect(partialUpdateResponse.status()).toBe(200);

    const completeStubId = await queueStub(completeStubUrl);
    const completeRawContentResponse = await page.request.patch(
      `/api/job-stubs/${completeStubId}/raw-content`,
      { data: { raw_content: rawContentText } }
    );
    expect(completeRawContentResponse.status()).toBe(200);
    const completeParsedFieldsResponse = await page.request.patch(
      `/api/job-stubs/${completeStubId}/parsed-fields`,
      { data: completeParsedFields }
    );
    expect(completeParsedFieldsResponse.status()).toBe(200);
  });

  await test.step('Act: Navigate to Triage', async () => {
    await triageQueuePage.goto();
  });

  await test.step('Assert: A URL-only stub is flagged as having nothing yet', async () => {
    await expect(triageQueuePage.stageIndicator(urlOnlyStubUrl)).toHaveAccessibleName(
      'URL only: no raw content and no parsed fields'
    );
  });

  await test.step('Assert: A stub with raw content shows it, and its status is not inferred', async () => {
    await expect(triageQueuePage.stageIndicator(rawContentStubUrl)).toHaveAccessibleName(
      'Raw content present, no parsed fields'
    );
    await expect(triageQueuePage.statusBadge(rawContentStubUrl, 'Stubbed')).toBeVisible();
  });

  await test.step('Assert: A partially parsed stub names exactly the missing essential fields', async () => {
    const expectedLabel =
      'Parsed fields partially populated. Missing: company, description. No raw content.';
    await expect(triageQueuePage.stageIndicator(partialStubUrl)).toHaveAccessibleName(
      expectedLabel
    );
    await expect(triageQueuePage.stageIndicator(partialStubUrl)).toHaveAttribute(
      'title',
      expectedLabel
    );
  });

  await test.step('Assert: A fully parsed stub shows parsed state over raw content, and still reports raw content', async () => {
    await expect(triageQueuePage.stageIndicator(completeStubUrl)).toHaveAccessibleName(
      'Parsed fields: company, title and description all present. Raw content present.'
    );
  });
});
