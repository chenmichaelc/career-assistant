// lib/types.ts
// Career Assistant — Shared type definitions
// All shared types and vocabulary types live here.
// Module-specific types are co-located with their modules.

// ─── Vocabulary types ─────────────────────────────────────────────────────────

export type RoleStatus =
  | 'Resume Needed'
  | 'Resume Ready'
  | 'Applied'
  | 'Callback'
  | 'In Interview'
  | 'Offer Accepted'
  | 'Offer Declined'
  | 'Skipped'
  | 'Closed'
  | 'On Hold'
  | 'Pending Triage';

export const VALID_STATUSES: RoleStatus[] = [
  'Resume Needed',
  'Resume Ready',
  'Applied',
  'Callback',
  'In Interview',
  'Offer Accepted',
  'Offer Declined',
  'Skipped',
  'Closed',
  'On Hold',
  'Pending Triage',
];

const VALID_STATUS_SET = new Set<string>(VALID_STATUSES);

export function isRoleStatus(value: string): value is RoleStatus {
  return VALID_STATUS_SET.has(value);
}

export type Candidacy = 'Slam Dunk' | 'Competitive' | 'Reach' | 'Skip';

export const VALID_CANDIDACIES: Candidacy[] = ['Slam Dunk', 'Competitive', 'Reach', 'Skip'];

export type InOfficeExpectation = 'Remote' | 'Hybrid' | 'In-Office' | 'Unknown';

export const VALID_IN_OFFICE_EXPECTATIONS: InOfficeExpectation[] = [
  'Remote',
  'Hybrid',
  'In-Office',
  'Unknown',
];

const VALID_IN_OFFICE_EXPECTATION_SET = new Set<string>(VALID_IN_OFFICE_EXPECTATIONS);

export function isInOfficeExpectation(value: string): value is InOfficeExpectation {
  return VALID_IN_OFFICE_EXPECTATION_SET.has(value);
}

export type SkipReasonType =
  | 'Wrong Industry'
  | 'Culture'
  | 'Ethics - Exploitative Industry/Product'
  | 'Ethics - Defense/Military'
  | 'Ethics - Surveillance'
  | 'Ethics - Other'
  | 'Location'
  | 'Compensation'
  | 'Skills Gap'
  | 'Other'
  | 'Unknown';

export const VALID_SKIP_REASONS: SkipReasonType[] = [
  'Wrong Industry',
  'Culture',
  'Ethics - Exploitative Industry/Product',
  'Ethics - Defense/Military',
  'Ethics - Surveillance',
  'Ethics - Other',
  'Location',
  'Compensation',
  'Skills Gap',
  'Other',
  'Unknown',
];

// See isRoleStatus above for why this Set exists alongside the typed array.
const VALID_SKIP_REASON_SET = new Set<string>(VALID_SKIP_REASONS);

export function isSkipReasonType(value: string): value is SkipReasonType {
  return VALID_SKIP_REASON_SET.has(value);
}

export type TerminationReasonType =
  | 'Screened Out'
  | 'Filled'
  | 'Cancelled'
  | 'Abandoned'
  | 'Withdrew - Ethics - Exploitative Industry/Product'
  | 'Withdrew - Ethics - Defense/Military'
  | 'Withdrew - Ethics - Surveillance'
  | 'Withdrew - Ethics - Other'
  | 'Withdrew - Culture'
  | 'Withdrew - Compensation'
  | 'Withdrew - Skills Gap'
  | 'Withdrew - Location'
  | 'Withdrew - Other';

export const VALID_TERMINATION_REASONS: TerminationReasonType[] = [
  'Screened Out',
  'Filled',
  'Cancelled',
  'Abandoned',
  'Withdrew - Ethics - Exploitative Industry/Product',
  'Withdrew - Ethics - Defense/Military',
  'Withdrew - Ethics - Surveillance',
  'Withdrew - Ethics - Other',
  'Withdrew - Culture',
  'Withdrew - Compensation',
  'Withdrew - Skills Gap',
  'Withdrew - Location',
  'Withdrew - Other',
];

// See isRoleStatus above for why this Set exists alongside the typed array.
const VALID_TERMINATION_REASON_SET = new Set<string>(VALID_TERMINATION_REASONS);

export function isTerminationReasonType(value: string): value is TerminationReasonType {
  return VALID_TERMINATION_REASON_SET.has(value);
}

// ─── Shared domain types ──────────────────────────────────────────────────────

export interface SkipReason {
  reason: SkipReasonType;
  note: string | null;
}

export interface TerminationReason {
  reason: TerminationReasonType;
  note: string | null;
}

export interface RoleInput {
  company: string;
  title: string;
  url: string;
  role_status: RoleStatus;
  candidacy?: Candidacy | null;
  applied_date?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  location?: string | null;
  in_office_expectation?: InOfficeExpectation | null;
  notes?: string | null;
  jd: string;
  skip_reasons?: SkipReason[] | null;
  termination_reasons?: TerminationReason[] | null;
}

// ─── DB row types ─────────────────────────────────────────────────────────────

export interface RoleRow {
  jd: string;
  id: number;
  company: string;
  title: string;
  url: string | null;
  role_status: RoleStatus;
  candidacy: Candidacy | null;
  applied_date: string | null;
  salary_min: number | null;
  salary_max: number | null;
  location: string | null;
  in_office_expectation: InOfficeExpectation | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type { RoleSortKey } from './db/roles.db';

// ─── Job stubs ──────────────────────────────────────────────────────────────

export type JobStubStatus = 'Stubbed' | 'Scraped' | 'Parsed' | 'Ready to Promote';

export const VALID_JOB_STUB_STATUSES: JobStubStatus[] = [
  'Stubbed',
  'Scraped',
  'Parsed',
  'Ready to Promote',
];

const VALID_JOB_STUB_STATUS_SET = new Set<string>(VALID_JOB_STUB_STATUSES);

export function isJobStubStatus(value: string): value is JobStubStatus {
  return VALID_JOB_STUB_STATUS_SET.has(value);
}

export interface JobStubRow {
  id: number;
  url: string;
  status: JobStubStatus;
  raw_content: string | null;
  parsed_company: string | null;
  parsed_title: string | null;
  parsed_description: string | null;
  parsed_salary_min: number | null;
  parsed_salary_max: number | null;
  parsed_candidacy: Candidacy | null;
  parsed_role_status: RoleStatus | null;
  parsed_skip_reasons: string | null;
  parsed_termination_reasons: string | null;
  parsed_location: string | null;
  parsed_in_office_expectation: InOfficeExpectation | null;
  created_at: string;
}
