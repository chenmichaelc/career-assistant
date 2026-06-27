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
  readonly notesField: Locator;
  readonly jobDescriptionField: Locator;

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
    this.notesField = page
      .locator('#notes-region')
      .filter({ hasText: 'Notes' })
      .getByRole('textbox');
    this.jobDescriptionField = page
      .locator('#job-description-region')
      .filter({ hasText: 'Job Description' })
      .getByRole('textbox');

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
    if (fields.notes) {
      await this.notesField.fill(fields.notes);
    }
    await this.jobDescriptionField.fill(fields.jd);
  }
}
