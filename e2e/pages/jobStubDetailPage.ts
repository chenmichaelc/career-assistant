// e2e/pages/jobStubDetailPage.ts

import { type Locator, type Page } from '@playwright/test';

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

  // ─── Import ───────────────────────────────────────────────────────────────

  readonly importTextarea: Locator;
  readonly importButton: Locator;
  readonly importError: Locator;

  // ─── Parsed fields ────────────────────────────────────────────────────────

  readonly parsedFieldsSection: Locator;
  readonly companyInput: Locator;
  readonly titleInput: Locator;
  readonly saveFieldsButton: Locator;
  readonly saveError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.backLink = page.getByRole('link', { name: '← triage' });
    this.url = page.getByTestId('stub-url');

    const statusCard = page.getByTestId('status-card');
    this.statusValue = page.getByTestId('status-value');
    this.statusSelect = statusCard.locator('select');
    this.statusUpdateButton = statusCard.getByRole('button', { name: 'update' });

    this.rawContentSection = page.getByTestId('raw-content-section');

    const importSection = page.getByTestId('import-section');
    this.importTextarea = importSection.getByTestId('import-textarea');
    this.importButton = importSection.getByTestId('import-button');
    this.importError = importSection.getByTestId('import-error');

    this.parsedFieldsSection = page.getByTestId('parsed-fields-section');
    this.companyInput = this.parsedFieldsSection.getByTestId('parsed-company-input');
    this.titleInput = this.parsedFieldsSection.getByTestId('parsed-title-input');
    this.saveFieldsButton = this.parsedFieldsSection.getByTestId('save-fields-button');
    this.saveError = this.parsedFieldsSection.getByTestId('save-error');
  }

  async goto(id: number) {
    await this.page.goto(`/job-stubs/${id}`);
  }
}
