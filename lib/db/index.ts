// lib/db/index.ts
// Aggregates all single-table CRUD modules into a single namespace object.

import * as roles from './roles.db';
import * as skipReasons from './skip-reasons.db';
import * as terminationReasons from './termination-reasons.db';
import * as jobDescriptions from './job-descriptions.db';
import * as jobStubs from './job-stubs.db';

export const db = {
  roles,
  skipReasons,
  terminationReasons,
  jobDescriptions,
  jobStubs,
};

export type { RoleInsertData } from './roles.db';
export type { SkipReasonRow } from './skip-reasons.db';
export type { TerminationReasonRow } from './termination-reasons.db';
export type { JobDescriptionRow } from './job-descriptions.db';
