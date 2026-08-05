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
  readonly modeToggle: Locator;
  readonly lineModeRender: Locator;
  readonly wordModeRender: Locator;
  readonly wordAddedSegments: Locator;
  readonly wordRemovedSegments: Locator;

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
    this.modeToggle = page.getByTestId('diff-mode-toggle');
    this.lineModeRender = this.diffRender.getByTestId('diff-line-mode');
    this.wordModeRender = this.diffRender.getByTestId('diff-word-mode');
    this.wordAddedSegments = this.wordModeRender.getByTestId('diff-word-added');
    this.wordRemovedSegments = this.wordModeRender.getByTestId('diff-word-removed');
  }

  async goto() {
    await this.page.goto('/utilities/diff');
  }

  async setInputs(oldText: string, newText: string) {
    await this.originalTextArea.fill(oldText);
    await this.newTextArea.fill(newText);
  }
}
