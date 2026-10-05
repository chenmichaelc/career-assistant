// client/tests/unit/utils/stubToRoleForm.test.ts

import { describe, test, expect } from 'vitest';
import {
  buildRoleFormFromStub,
  emptyRoleForm,
  DEFAULT_ROLE_STATUS,
  StubFormSource,
} from '@/utils/stubToRoleForm';

const stubUrl = 'https://example.com/jobs/1';

const urlOnlyStub: StubFormSource = {
  url: stubUrl,
  parsed_company: null,
  parsed_title: null,
  parsed_description: null,
  parsed_salary_min: null,
  parsed_salary_max: null,
  parsed_candidacy: null,
  parsed_role_status: null,
  parsed_skip_reasons: null,
  parsed_termination_reasons: null,
  parsed_location: null,
  parsed_in_office_expectation: null,
};

describe('buildRoleFormFromStub', () => {
  const skipReasons = [{ reason: 'Location', note: 'Onsite only' }];
  const terminationReasons = [{ reason: 'Filled', note: null }];

  test('carries every parsed field onto the matching form field', () => {
    const parsedStub = {
      ...urlOnlyStub,
      parsed_company: 'Acme',
      parsed_title: 'Engineer',
      parsed_description: 'Builds things.',
      parsed_salary_min: 100000,
      parsed_salary_max: 150000,
      parsed_candidacy: 'Competitive' as const,
      parsed_role_status: 'Skipped' as const,
      parsed_skip_reasons: JSON.stringify(skipReasons),
      parsed_termination_reasons: JSON.stringify(terminationReasons),
      parsed_location: 'Austin, TX',
      parsed_in_office_expectation: 'Hybrid' as const,
    };

    expect(buildRoleFormFromStub(parsedStub)).toEqual({
      company: 'Acme',
      title: 'Engineer',
      url: stubUrl,
      role_status: 'Skipped',
      candidacy: 'Competitive',
      salary_min: 100000,
      salary_max: 150000,
      location: 'Austin, TX',
      in_office_expectation: 'Hybrid',
      notes: '',
      jd: 'Builds things.',
      skip_reasons: skipReasons,
      termination_reasons: terminationReasons,
    });
  });

  test('a URL-only stub prefills just the URL and keeps the default role status', () => {
    expect(buildRoleFormFromStub(urlOnlyStub)).toEqual({ ...emptyRoleForm(), url: stubUrl });
    expect(buildRoleFormFromStub(urlOnlyStub).role_status).toBe(DEFAULT_ROLE_STATUS);
  });

  test('a stub with unparseable stored reasons still prefills, with no reasons', () => {
    const corruptReasonsStub = { ...urlOnlyStub, parsed_skip_reasons: 'not json' };
    expect(buildRoleFormFromStub(corruptReasonsStub).skip_reasons).toEqual([]);
  });
});
