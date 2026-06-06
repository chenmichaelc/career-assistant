import { type Locator, type Page } from '@playwright/test';

export class RolesPage {
    readonly page: Page;
    readonly topMenuRolesLink: Locator;
    readonly topMenuAddLink: Locator;
    readonly topMenuQueryLink: Locator;
    readonly topMenuBackupLink: Locator;
    readonly rolesTableHeading: Locator;
    readonly searchButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.topMenuRolesLink = page.getByRole('link', { name: 'roles' });
        this.topMenuAddLink = page.getByRole('link', { name: 'add' });
        this.topMenuQueryLink = page.getByRole('link', { name: 'query' });
        this.topMenuBackupLink = page.getByRole('button', { name: 'backup' });
        this.rolesTableHeading = page.getByRole('heading', { name: 'Roles' });
        this.searchButton = page.getByRole('button', { name: 'search' });
    }
}