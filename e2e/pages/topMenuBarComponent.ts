import { type Locator, type Page } from '@playwright/test';

export class TopMenuBarComponent {
  readonly topMenuBarContainer: Locator;
  readonly rolesLink: Locator;
  readonly addLink: Locator;
  readonly queryLink: Locator;
  readonly backupButton: Locator;

  constructor(page: Page) {
    this.topMenuBarContainer = page.getByTestId('menu-bar');
    this.rolesLink = this.topMenuBarContainer.getByRole('link', { name: 'roles' });
    this.addLink = this.topMenuBarContainer.getByRole('link', { name: 'add' });
    this.queryLink = this.topMenuBarContainer.getByRole('link', { name: 'query' });
    this.backupButton = this.topMenuBarContainer.getByRole('button', { name: 'backup' });
  }
}
