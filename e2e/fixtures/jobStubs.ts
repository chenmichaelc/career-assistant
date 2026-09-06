// e2e/fixtures/jobStubs.ts
// Career Assistant — E2E test job-stub fixtures
//
// job_stubs has no company field, so the [E2E] company-prefix convention
// (see roles.ts) doesn't apply here. A dedicated hostname is used instead:
// cleanseUrl() already lowercases the hostname, so a lowercase-authored
// marker survives normalization unchanged, and cleanup can match it with a
// single prefix check instead of a substring search over an arbitrary path.

export const E2E_STUB_URL_PREFIX = 'https://e2e.testing.stub.com/';

export function e2eStubUrl(testInfo: { project: { name: string }; testId: string }): string {
  const projectSlug = testInfo.project.name.replace(/\s+/g, '-');
  return `${E2E_STUB_URL_PREFIX}${projectSlug}/${testInfo.testId}`;
}
