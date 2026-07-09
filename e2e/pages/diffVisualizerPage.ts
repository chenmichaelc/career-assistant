// e2e/pages/diffVisualizerPage.ts

import { type Locator, type Page } from '@playwright/test';
import { TopMenuBarComponent } from './topMenuBarComponent';

export class DiffVisualizerPage {
  readonly page: Page;
  readonly topMenuBar: TopMenuBarComponent;

  readonly heading: Locator;
  readonly originalTextArea: Locator;
  readonly newTextArea: Locator;
  readonly diffRender: Locator;
  readonly trailingWhitespaceMarkers: Locator;

  constructor(page: Page) {
    this.page = page;
    this.topMenuBar = new TopMenuBarComponent(page);

    this.heading = page.getByRole('heading', { name: 'Diff Visualizer' });
    this.originalTextArea = page
      .locator('#diff-original-input-region')
      .filter({ hasText: 'original' })
      .getByRole('textbox');
    this.newTextArea = page
      .locator('#diff-new-input-region')
      .filter({ hasText: 'new' })
      .getByRole('textbox');
    this.diffRender = page.getByTestId('diff-render');
    this.trailingWhitespaceMarkers = this.diffRender.getByTestId('diff-trailing-whitespace');
  }

  async goto() {
    await this.page.goto('/utilities/diff');
  }

  async setInputs(oldText: string, newText: string) {
    await this.originalTextArea.fill(oldText);
    await this.newTextArea.fill(newText);
  }
}
