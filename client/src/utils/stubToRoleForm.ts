// client/src/utils/stubToRoleForm.ts

import { JobStubRow } from '../../../lib/types';
import { ReasonEntry, parseStoredReasons } from './storedReasons';

export interface RoleFormValues {
  company: string;
  title: string;
  url: string;
  role_status: string;
  candidacy: string;
  salary_min: number | null;
  salary_max: number | null;
  location: string;
  in_office_expectation: string;
  notes: string;
  jd: string;
  skip_reasons: ReasonEntry[];
  termination_reasons: ReasonEntry[];
}

export type StubFormSource = Pick<
  JobStubRow,
  | 'url'
  | 'parsed_company'
  | 'parsed_title'
  | 'parsed_description'
  | 'parsed_salary_min'
  | 'parsed_salary_max'
  | 'parsed_candidacy'
  | 'parsed_role_status'
  | 'parsed_skip_reasons'
  | 'parsed_termination_reasons'
  | 'parsed_location'
  | 'parsed_in_office_expectation'
>;

export const DEFAULT_ROLE_STATUS = 'Pending Triage';

export function emptyRoleForm(): RoleFormValues {
  return {
    company: '',
    title: '',
    url: '',
    role_status: DEFAULT_ROLE_STATUS,
    candidacy: '',
    salary_min: null,
    salary_max: null,
    location: '',
    in_office_expectation: '',
    notes: '',
    jd: '',
    skip_reasons: [],
    termination_reasons: [],
  };
}

// raw_content is deliberately not carried over: the stub is deleted when the
// role is created, so it is discarded with it.
export function buildRoleFormFromStub(stub: StubFormSource): RoleFormValues {
  return {
    company: stub.parsed_company ?? '',
    title: stub.parsed_title ?? '',
    url: stub.url,
    role_status: stub.parsed_role_status ?? DEFAULT_ROLE_STATUS,
    candidacy: stub.parsed_candidacy ?? '',
    salary_min: stub.parsed_salary_min ?? null,
    salary_max: stub.parsed_salary_max ?? null,
    location: stub.parsed_location ?? '',
    in_office_expectation: stub.parsed_in_office_expectation ?? '',
    notes: '',
    jd: stub.parsed_description ?? '',
    skip_reasons: parseStoredReasons(stub.parsed_skip_reasons),
    termination_reasons: parseStoredReasons(stub.parsed_termination_reasons),
  };
}
