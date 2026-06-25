// e2e/pages/rolesPage.ts

import { type Locator, type Page } from '@playwright/test';
import { TopMenuBarComponent } from './topMenuBarComponent';

export class RolesPage {
  readonly page: Page;
  readonly topMenuBar: TopMenuBarComponent;

  readonly heading: Locator;
  readonly searchButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.topMenuBar = new TopMenuBarComponent(page);
    this.heading = page.getByRole('heading', { name: 'Roles' });
    this.searchButton = page.getByRole('button', { name: 'search' });
  }
}
