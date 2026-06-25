// e2e/pages/roleDetailPage.ts

import { type Locator, type Page } from '@playwright/test';
import { TopMenuBarComponent } from './topMenuBarComponent';

export class RoleDetailPage {
  readonly page: Page;
  readonly topMenuBar: TopMenuBarComponent;

  // ─── Header ───────────────────────────────────────────────────────────────

  readonly backNavigationLink: Locator;
  readonly exportButton: Locator;
  readonly deleteButton: Locator;
  readonly companyNameHeading: Locator;
  readonly roleNameText: Locator;
  readonly roleStatusBadge: Locator;

  // ─── Meta grid ────────────────────────────────────────────────────────────

  readonly candidacyCard: Locator;
  readonly appliedDateCard: Locator;
  readonly salaryCard: Locator;
  readonly urlCard: Locator;

  // ─── Status update ────────────────────────────────────────────────────────

  readonly updateStatusCard: Locator;
  readonly statusSelect: Locator;
  readonly updateStatusButton: Locator;

  // ─── Reason modal ─────────────────────────────────────────────────────────

  readonly reasonModal: Locator;
  readonly reasonModalSelect: Locator;
  readonly reasonModalNoteInput: Locator;
  readonly reasonModalConfirmButton: Locator;
  readonly reasonModalCancelButton: Locator;
  readonly reasonModalError: Locator;

  // ─── Skip reasons ─────────────────────────────────────────────────────────

  readonly skipReasonsSection: Locator;
  readonly addSkipReasonSelect: Locator;
  readonly addSkipReasonNoteInput: Locator;
  readonly addSkipReasonButton: Locator;
  readonly addSkipReasonError: Locator;

  // ─── Termination reasons ──────────────────────────────────────────────────

  readonly terminationReasonsSection: Locator;
  readonly addTerminationReasonSelect: Locator;
  readonly addTerminationReasonNoteInput: Locator;
  readonly addTerminationReasonButton: Locator;
  readonly addTerminationReasonError: Locator;

  // ─── Export modal ─────────────────────────────────────────────────────────

  readonly exportModal: Locator;
  readonly exportSimpleButton: Locator;
  readonly exportRichButton: Locator;
  readonly exportContent: Locator;
  readonly exportCopyButton: Locator;
  readonly exportCloseButton: Locator;

  // ─── Delete modal ─────────────────────────────────────────────────────────

  readonly deleteModal: Locator;
  readonly deleteIfCleanButton: Locator;
  readonly forceDeleteButton: Locator;
  readonly deleteCancelButton: Locator;
  readonly deleteError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.topMenuBar = new TopMenuBarComponent(page);

    // Header
    this.backNavigationLink = page.getByRole('link', { name: '← roles' });
    this.exportButton = page.getByRole('button', { name: 'export' });
    this.deleteButton = page.getByRole('button', { name: 'delete' });
    this.companyNameHeading = page.getByTestId('company-name');
    this.roleNameText = page.getByTestId('role-name');
    this.roleStatusBadge = page.getByTestId('role-status-badge');

    // Meta grid
    this.candidacyCard = page.getByTestId('candidacy-card');
    this.appliedDateCard = page.getByTestId('applied-card');
    this.salaryCard = page.getByTestId('salary-card');
    this.urlCard = page.getByTestId('url-card');

    // Status update
    this.updateStatusCard = page.getByTestId('update-status-card');
    this.statusSelect = this.updateStatusCard.locator('select');
    this.updateStatusButton = this.updateStatusCard.getByRole('button', { name: 'update' });

    // Reason modal
    this.reasonModal = page.getByTestId('reason-modal');
    this.reasonModalSelect = this.reasonModal.locator('select');
    this.reasonModalNoteInput = this.reasonModal.getByTestId('note-field');
    this.reasonModalConfirmButton = this.reasonModal.getByRole('button', { name: 'confirm' });
    this.reasonModalCancelButton = this.reasonModal.getByRole('button', { name: 'cancel' });
    this.reasonModalError = this.reasonModal.locator('.text-danger');

    // Skip reasons
    this.skipReasonsSection = page.getByTestId('skip-reasons-section');
    this.addSkipReasonSelect = this.skipReasonsSection.locator('select');
    this.addSkipReasonNoteInput = this.skipReasonsSection.locator(
      'input[placeholder="note (optional)"]'
    );
    this.addSkipReasonButton = this.skipReasonsSection.getByRole('button', { name: 'add' });
    this.addSkipReasonError = this.skipReasonsSection.locator('.text-danger');

    // Termination reasons
    this.terminationReasonsSection = page.getByTestId('termination-reasons-section');
    this.addTerminationReasonSelect = this.terminationReasonsSection.locator('select');
    this.addTerminationReasonNoteInput = this.terminationReasonsSection.locator(
      'input[placeholder="note (optional)"]'
    );
    this.addTerminationReasonButton = this.terminationReasonsSection.getByRole('button', {
      name: 'add',
    });
    this.addTerminationReasonError = this.terminationReasonsSection.locator('.text-danger');

    // Export modal
    this.exportModal = page.getByTestId('export-modal');
    this.exportSimpleButton = this.exportModal.getByRole('button', { name: 'simple' });
    this.exportRichButton = this.exportModal.getByRole('button', { name: 'rich' });
    this.exportContent = this.exportModal.locator('pre');
    this.exportCopyButton = this.exportModal.getByRole('button', { name: 'copy' });
    this.exportCloseButton = this.exportModal.getByRole('button', { name: 'close' });

    // Delete modal
    this.deleteModal = page.getByTestId('delete-modal');
    this.deleteIfCleanButton = this.deleteModal.getByRole('button', { name: 'delete if clean' });
    this.forceDeleteButton = this.deleteModal.getByRole('button', { name: 'force delete all' });
    this.deleteCancelButton = this.deleteModal.getByRole('button', { name: 'cancel' });
    this.deleteError = this.deleteModal.locator('.text-danger');
  }

  async goto(id: number) {
    await this.page.goto(`/roles/${id}`);
  }
}
