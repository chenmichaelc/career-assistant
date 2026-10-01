// tests/fixtures/jobStubParseContract.fixture.ts

export const JOB_STUB_PARSE_CONTRACT_FIXTURE = {
  company: 'Diogenes Club',
  title: 'Founding Auditor',
  description:
    'Establishes and reviews inter-departmental reporting standards across a dozen ministries.',
  salary_min: 120000,
  salary_max: 160000,
  candidacy: 'Competitive',
  role_status: 'Pending Triage',
  skip_reasons: [
    { reason: 'Location', note: 'Whitehall commute is a dealbreaker.' },
    { reason: 'Compensation', note: null },
  ],
  termination_reasons: [{ reason: 'Filled', note: 'Posting closed before an offer was made.' }],
  location: 'Whitehall, London',
  in_office_expectation: 'Hybrid',
};

// Same shape, one invalid enum value — exercises the rejection path.
export const JOB_STUB_PARSE_CONTRACT_INVALID_FIXTURE = {
  ...JOB_STUB_PARSE_CONTRACT_FIXTURE,
  in_office_expectation: 'Not A Real Value',
};
