// e2e/pages/addRolePage.ts

import { type Locator, type Page } from '@playwright/test';
import { TopMenuBarComponent } from './topMenuBarComponent';

export class AddRolePage {
  readonly page: Page;
  readonly topMenuBar: TopMenuBarComponent;

  // ─── Form fields ──────────────────────────────────────────────────────────

  readonly heading: Locator;
  readonly companyNameField: Locator;
  readonly jobTitleField: Locator;
  readonly postingUrlField: Locator;
  readonly roleStatusSelect: Locator;
  readonly salaryMinimumField: Locator;
  readonly salaryMaximumField: Locator;
  readonly locationField: Locator;
  readonly inOfficeExpectationSelect: Locator;
  readonly notesField: Locator;
  readonly jobDescriptionField: Locator;

  // ─── Candidacy and reasons ────────────────────────────────────────────────

  readonly candidacySelect: Locator;
  readonly skipReasonsEditor: Locator;
  readonly skipReasonRows: Locator;
  readonly addSkipReasonSelect: Locator;
  readonly addSkipReasonNoteInput: Locator;
  readonly addSkipReasonButton: Locator;
  readonly terminationReasonsEditor: Locator;
  readonly terminationReasonRows: Locator;
  readonly addTerminationReasonSelect: Locator;
  readonly addTerminationReasonNoteInput: Locator;
  readonly addTerminationReasonButton: Locator;

  // ─── Actions ──────────────────────────────────────────────────────────────

  readonly addRoleButton: Locator;
  readonly cancelLink: Locator;

  // ─── Feedback ─────────────────────────────────────────────────────────────

  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.topMenuBar = new TopMenuBarComponent(page);

    this.heading = page.getByRole('heading', { name: 'Add Role' });
    this.companyNameField = page
      .locator('#company-name-region')
      .filter({ hasText: 'Company Name' })
      .getByRole('textbox');
    this.jobTitleField = page
      .locator('#job-title-region')
      .filter({ hasText: 'Job Title' })
      .getByRole('textbox');
    this.postingUrlField = page
      .locator('#posting-url-region')
      .filter({ hasText: 'Posting URL' })
      .getByRole('textbox');
    this.roleStatusSelect = page
      .locator('#role-status-region')
      .filter({ hasText: 'Role Status' })
      .getByRole('combobox');
    this.salaryMinimumField = page
      .locator('#salary-minimum-region')
      .filter({ hasText: 'Salary Minimum' })
      .getByRole('spinbutton');
    this.salaryMaximumField = page
      .locator('#salary-maximum-region')
      .filter({ hasText: 'Salary Maximum' })
      .getByRole('spinbutton');
    this.locationField = page
      .locator('#location-region')
      .filter({ hasText: 'Location' })
      .getByRole('textbox');
    this.inOfficeExpectationSelect = page
      .locator('#in-office-expectation-region')
      .filter({ hasText: 'In-Office Expectation' })
      .getByRole('combobox');
    this.notesField = page
      .locator('#notes-region')
      .filter({ hasText: 'Notes' })
      .getByRole('textbox');
    this.jobDescriptionField = page
      .locator('#job-description-region')
      .filter({ hasText: 'Job Description' })
      .getByRole('textbox');

    this.candidacySelect = page
      .locator('#candidacy-region')
      .filter({ hasText: 'Candidacy' })
      .getByRole('combobox');

    this.skipReasonsEditor = page.getByTestId('skip-reasons-editor');
    this.skipReasonRows = this.skipReasonsEditor.getByTestId('skip-reason-row');
    const addSkipReasonSection = this.skipReasonsEditor.getByTestId('add-skip-reason-section');
    this.addSkipReasonSelect = addSkipReasonSection.getByRole('combobox');
    this.addSkipReasonNoteInput = addSkipReasonSection.getByRole('textbox');
    this.addSkipReasonButton = addSkipReasonSection.getByRole('button', { name: 'add' });

    this.terminationReasonsEditor = page.getByTestId('termination-reasons-editor');
    this.terminationReasonRows =
      this.terminationReasonsEditor.getByTestId('termination-reason-row');
    const addTerminationReasonSection = this.terminationReasonsEditor.getByTestId(
      'add-termination-reason-section'
    );
    this.addTerminationReasonSelect = addTerminationReasonSection.getByRole('combobox');
    this.addTerminationReasonNoteInput = addTerminationReasonSection.getByRole('textbox');
    this.addTerminationReasonButton = addTerminationReasonSection.getByRole('button', {
      name: 'add',
    });

    this.addRoleButton = page.getByRole('button', { name: 'add role' });
    this.cancelLink = page.getByRole('link', { name: 'cancel' });

    this.errorMessage = page.locator('.text-danger').filter({ hasText: /.+/ });
  }

  async goto() {
    await this.page.goto('/add');
  }

  async populateFieldsAndAddRole(fields: {
    company: string;
    title: string;
    url: string;
    role_status?: string;
    salaryMin?: string;
    salaryMax?: string;
    location?: string;
    in_office_expectation?: string;
    notes?: string;
    jd: string;
  }) {
    await this.companyNameField.fill(fields.company);
    await this.jobTitleField.fill(fields.title);
    await this.postingUrlField.fill(fields.url);
    if (fields.role_status) {
      await this.roleStatusSelect.selectOption(fields.role_status);
    }
    if (fields.salaryMin) {
      await this.salaryMinimumField.fill(fields.salaryMin);
    }
    if (fields.salaryMax) {
      await this.salaryMaximumField.fill(fields.salaryMax);
    }
    if (fields.location) {
      await this.locationField.fill(fields.location);
    }
    if (fields.in_office_expectation) {
      await this.inOfficeExpectationSelect.selectOption(fields.in_office_expectation);
    }
    if (fields.notes) {
      await this.notesField.fill(fields.notes);
    }
    await this.jobDescriptionField.fill(fields.jd);
  }
}
