// e2e/pages/sqlQueryPage.ts

import { type Locator, type Page } from '@playwright/test';
import { TopMenuBarComponent } from './topMenuBarComponent';

export class SqlQueryPage {
  readonly page: Page;
  readonly topMenuBar: TopMenuBarComponent;

  readonly heading: Locator;

  readonly writeModeToggle: Locator;
  readonly writeModeLabel: Locator;
  readonly writeModeWarning: Locator;

  readonly sqlTextarea: Locator;
  readonly executeButton: Locator;
  readonly clearButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.topMenuBar = new TopMenuBarComponent(page);

    this.heading = page.getByRole('heading', { name: 'SQL Query' });

    this.writeModeToggle = page.getByTestId('write-mode-toggle');
    this.writeModeLabel = page.getByTestId('write-mode-label');
    this.writeModeWarning = page.getByTestId('write-mode-warning');

    this.sqlTextarea = page.locator('textarea');
    this.executeButton = page.getByRole('button', { name: 'execute' });
    this.clearButton = page.getByRole('button', { name: 'clear' });
  }

  async goto() {
    await this.page.goto('/query');
  }

  async executeQuery(sql: string) {
    await this.sqlTextarea.fill(sql);
    await this.executeButton.click();
  }

  async toggleWriteMode() {
    await this.writeModeToggle.click();
  }
}
