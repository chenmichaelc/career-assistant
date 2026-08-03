// e2e/pages/resumeConverterPage.ts

import { type Locator, type Page } from '@playwright/test';
import { TopMenuBarComponent } from './topMenuBarComponent';

export class ResumeConverterPage {
  readonly page: Page;
  readonly topMenuBar: TopMenuBarComponent;

  readonly heading: Locator;
  readonly resumeTextArea: Locator;
  readonly convertButton: Locator;
  readonly conversionError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.topMenuBar = new TopMenuBarComponent(page);

    this.heading = page.getByRole('heading', { name: 'Resume → DOCX Converter' });
    this.resumeTextArea = page
      .locator('#resume-input-region')
      .filter({ hasText: 'plain-text resume' })
      .getByRole('textbox');
    this.convertButton = page.getByRole('button', { name: /convert & download|converting/ });
    this.conversionError = page.getByTestId('conversion-error');
  }

  async goto() {
    await this.page.goto('/utilities/resume-converter');
  }
}
