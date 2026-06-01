// client/src/constants.ts
// Shared vocabulary constants for the frontend

export const VALID_STATUSES = [
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
] as const;

export const VALID_SKIP_REASONS = [
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
] as const;

export const VALID_TERMINATION_REASONS = [
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
] as const;
