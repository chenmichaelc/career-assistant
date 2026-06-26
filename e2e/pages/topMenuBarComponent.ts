// e2e/pages/topMenuBarComponent.ts

import { type Locator, type Page } from '@playwright/test';

export class TopMenuBarComponent {
  readonly topMenuBarContainer: Locator;
  readonly rolesLink: Locator;
  readonly addLink: Locator;
  readonly queryLink: Locator;
  readonly adminDropdownMenu: Locator;
  readonly adminMenuButton: Locator;
  readonly backupButton: Locator;
  readonly cleanupButton: Locator;

  constructor(page: Page) {
    this.topMenuBarContainer = page.getByTestId('menu-bar');
    this.rolesLink = this.topMenuBarContainer.getByRole('link', { name: 'roles' });
    this.addLink = this.topMenuBarContainer.getByRole('link', { name: 'add' });
    this.queryLink = this.topMenuBarContainer.getByRole('link', { name: 'query' });
    this.adminDropdownMenu = this.topMenuBarContainer.getByTestId('admin-menu');
    this.adminMenuButton = this.adminDropdownMenu.getByRole('button', { name: 'admin ▾' });
    this.backupButton = this.adminDropdownMenu.getByRole('button', { name: 'backup' });
    this.cleanupButton = this.adminDropdownMenu.getByRole('button', { name: 'cleanup' });
  }
}
