// e2e/pages/jobStubDetailPage.ts

import { expect, type Locator, type Page } from '@playwright/test';

export class JobStubDetailPage {
  readonly page: Page;

  // ─── Header ───────────────────────────────────────────────────────────────

  readonly backLink: Locator;
  readonly url: Locator;

  // ─── Status ───────────────────────────────────────────────────────────────

  readonly statusValue: Locator;
  readonly statusSelect: Locator;
  readonly statusUpdateButton: Locator;

  // ─── Raw content ──────────────────────────────────────────────────────────

  readonly rawContentSection: Locator;
  readonly rawContentTextarea: Locator;

  // ─── Import ───────────────────────────────────────────────────────────────

  readonly importTextarea: Locator;
  readonly importButton: Locator;
  readonly importError: Locator;

  // ─── Parsed fields ────────────────────────────────────────────────────────

  readonly parsedFieldsSection: Locator;
  readonly companyInput: Locator;
  readonly titleInput: Locator;
  readonly roleStatusSelect: Locator;
  readonly saveFieldsButton: Locator;
  readonly saveError: Locator;
  readonly saveSuccess: Locator;

  // ─── Skip / termination reasons ──────────────────────────────────────────

  readonly skipReasonRows: Locator;
  readonly addSkipReasonSection: Locator;
  readonly addSkipReasonSelect: Locator;
  readonly addSkipReasonNoteInput: Locator;
  readonly addSkipReasonButton: Locator;
  readonly removeSkipReasonButtons: Locator;

  readonly terminationReasonRows: Locator;
  readonly addTerminationReasonSection: Locator;
  readonly addTerminationReasonSelect: Locator;
  readonly addTerminationReasonNoteInput: Locator;
  readonly addTerminationReasonButton: Locator;
  readonly removeTerminationReasonButtons: Locator;

  constructor(page: Page) {
    this.page = page;

    this.backLink = page.getByRole('link', { name: '← triage' });
    this.url = page.getByTestId('stub-url');

    const statusCard = page.getByTestId('status-card');
    this.statusValue = page.getByTestId('status-value');
    this.statusSelect = statusCard.locator('select');
    this.statusUpdateButton = statusCard.getByRole('button', { name: 'update' });

    this.rawContentSection = page.getByTestId('raw-content-section');
    this.rawContentTextarea = this.rawContentSection.getByTestId('raw-content-textarea');

    const importSection = page.getByTestId('import-section');
    this.importTextarea = importSection.getByTestId('import-textarea');
    this.importButton = importSection.getByTestId('import-button');
    this.importError = importSection.getByTestId('import-error');

    this.parsedFieldsSection = page.getByTestId('parsed-fields-section');
    this.companyInput = this.parsedFieldsSection.getByTestId('parsed-company-input');
    this.titleInput = this.parsedFieldsSection.getByTestId('parsed-title-input');
    this.roleStatusSelect = this.parsedFieldsSection.getByTestId('parsed-role-status-select');
    this.saveFieldsButton = this.parsedFieldsSection.getByTestId('save-fields-button');
    this.saveError = this.parsedFieldsSection.getByTestId('save-error');
    this.saveSuccess = this.parsedFieldsSection.getByTestId('save-success');

    this.skipReasonRows = this.parsedFieldsSection.getByTestId('skip-reason-row');
    this.addSkipReasonSection = this.parsedFieldsSection.getByTestId('add-skip-reason-section');
    this.addSkipReasonSelect = this.addSkipReasonSection.getByRole('combobox');
    this.addSkipReasonNoteInput = this.addSkipReasonSection.getByRole('textbox');
    this.addSkipReasonButton = this.addSkipReasonSection.getByRole('button', { name: 'add' });
    this.removeSkipReasonButtons = this.skipReasonRows.getByRole('button', { name: 'delete' });

    this.terminationReasonRows = this.parsedFieldsSection.getByTestId('termination-reason-row');
    this.addTerminationReasonSection = this.parsedFieldsSection.getByTestId(
      'add-termination-reason-section'
    );
    this.addTerminationReasonSelect = this.addTerminationReasonSection.getByRole('combobox');
    this.addTerminationReasonNoteInput = this.addTerminationReasonSection.getByRole('textbox');
    this.addTerminationReasonButton = this.addTerminationReasonSection.getByRole('button', {
      name: 'add',
    });
    this.removeTerminationReasonButtons = this.terminationReasonRows.getByRole('button', {
      name: 'delete',
    });
  }

  // Waits for the save to finish so a following reload can't abort the in-flight request.
  async save() {
    await this.saveFieldsButton.click();
    await expect(this.saveSuccess).toBeVisible();
  }

  async goto(id: number) {
    await this.page.goto(`/job-stubs/${id}`);
  }
}
