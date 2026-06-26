// e2e/fixtures/roles.ts
// Career Assistant — E2E test role fixtures

export interface RoleFixture {
  company: string;
  title: string;
  url: string;
  role_status: string;
  jd: string;
  salary_min?: string;
  salary_max?: string;
  notes?: string;
}

export const baseRole: RoleFixture = {
  company: '[E2E] Acme Corp',
  title: 'Software Engineer',
  url: 'https://example.com/job/1',
  role_status: 'Pending Triage',
  jd: 'A great job.',
};

export const TEST_COMPANIES: string[] = ['[E2E] Acme Corp'];
