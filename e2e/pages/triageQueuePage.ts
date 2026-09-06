// e2e/pages/triageQueuePage.ts

import { type Locator, type Page } from '@playwright/test';
import { TopMenuBarComponent } from './topMenuBarComponent';

export class TriageQueuePage {
  readonly page: Page;
  readonly topMenuBar: TopMenuBarComponent;

  // ─── Static elements ──────────────────────────────────────────────────────

  readonly heading: Locator;
  readonly emptyStateText: Locator;
  readonly stubList: Locator;
  readonly errorMessage: Locator;

  // ─── Quick-add ────────────────────────────────────────────────────────────

  readonly quickAddSection: Locator;
  readonly quickAddUrlField: Locator;
  readonly quickAddButton: Locator;

  // ─── Confirm modal (shared component) ────────────────────────────────────

  readonly confirmModal: Locator;
  readonly confirmModalConfirmButton: Locator;
  readonly confirmModalCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.topMenuBar = new TopMenuBarComponent(page);

    this.heading = page.getByRole('heading', { name: 'Triage' });
    this.emptyStateText = page.getByText('No stubs queued.');
    this.stubList = page.getByTestId('stub-list');
    this.errorMessage = page.locator('.text-danger').filter({ hasText: /.+/ });

    this.quickAddSection = page.getByTestId('quick-add-stub');
    this.quickAddUrlField = this.quickAddSection.getByRole('textbox');
    this.quickAddButton = this.quickAddSection.getByRole('button', { name: 'queue' });

    this.confirmModal = page.getByTestId('confirm-modal');
    this.confirmModalConfirmButton = this.confirmModal.getByRole('button', { name: 'delete' });
    this.confirmModalCancelButton = this.confirmModal.getByRole('button', { name: 'cancel' });
  }

  async goto() {
    await this.page.goto('/triage');
  }

  async queueUrl(url: string) {
    await this.quickAddUrlField.fill(url);
    await this.quickAddButton.click();
  }

  // A stub row has no unique accessible name of its own — scope to the zone
  // container (stub-row), then filter by its URL text, per
  // semantic-testing-rules.md's "Repeated data-testid on non-interactive rows".
  stubRow(url: string): Locator {
    return this.page.getByTestId('stub-row').filter({ hasText: url });
  }

  promoteButton(url: string): Locator {
    return this.stubRow(url).getByRole('button', { name: 'promote' });
  }

  deleteButton(url: string): Locator {
    return this.stubRow(url).getByRole('button', { name: 'delete' });
  }
}
