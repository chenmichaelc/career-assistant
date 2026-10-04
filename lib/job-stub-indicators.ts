// lib/job-stub-indicators.ts

import { JobStubRow } from './types';

export type ParsedFieldsIndicator = 'none' | 'partial' | 'complete';
export type EssentialParsedField = 'company' | 'title' | 'description';

// Where the stub is on the URL -> raw content -> parsed progression. Parsed
// state takes precedence over raw content, since it is further along.
export type StubStage = 'url-only' | 'raw-content-only' | 'parsed-partial' | 'parsed-complete';

export interface StubIndicators {
  hasRawContent: boolean;
  parsedFields: ParsedFieldsIndicator;
  missingEssentialFields: EssentialParsedField[];
  stage: StubStage;
}

export type StubIndicatorSource = Pick<
  JobStubRow,
  | 'raw_content'
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

const ESSENTIAL_PARSED_FIELDS: { name: EssentialParsedField; column: keyof StubIndicatorSource }[] =
  [
    { name: 'company', column: 'parsed_company' },
    { name: 'title', column: 'parsed_title' },
    { name: 'description', column: 'parsed_description' },
  ];

const NON_ESSENTIAL_TEXT_COLUMNS: (keyof StubIndicatorSource)[] = [
  'parsed_candidacy',
  'parsed_role_status',
  'parsed_location',
  'parsed_in_office_expectation',
];

const NUMBER_COLUMNS: (keyof StubIndicatorSource)[] = ['parsed_salary_min', 'parsed_salary_max'];

const JSON_ARRAY_COLUMNS: (keyof StubIndicatorSource)[] = [
  'parsed_skip_reasons',
  'parsed_termination_reasons',
];

function isPopulatedText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isPopulatedNumber(value: unknown): boolean {
  return typeof value === 'number';
}

// Reason columns store JSON text; an empty array ('[]') carries no information.
function isPopulatedJsonArray(value: unknown): boolean {
  if (!isPopulatedText(value)) return false;

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    return true;
  }
  return !Array.isArray(parsedValue) || parsedValue.length > 0;
}

function hasAnyParsedField(stub: StubIndicatorSource): boolean {
  const populatedEssentialField = ESSENTIAL_PARSED_FIELDS.some(({ column }) =>
    isPopulatedText(stub[column])
  );
  return (
    populatedEssentialField ||
    NON_ESSENTIAL_TEXT_COLUMNS.some((column) => isPopulatedText(stub[column])) ||
    NUMBER_COLUMNS.some((column) => isPopulatedNumber(stub[column])) ||
    JSON_ARRAY_COLUMNS.some((column) => isPopulatedJsonArray(stub[column]))
  );
}

export function deriveStubIndicators(stub: StubIndicatorSource): StubIndicators {
  const missingEssentialFields = ESSENTIAL_PARSED_FIELDS.filter(
    ({ column }) => !isPopulatedText(stub[column])
  ).map(({ name }) => name);

  let parsedFields: ParsedFieldsIndicator = 'none';
  if (missingEssentialFields.length === 0) {
    parsedFields = 'complete';
  } else if (hasAnyParsedField(stub)) {
    parsedFields = 'partial';
  }

  const hasRawContent = isPopulatedText(stub.raw_content);

  return {
    hasRawContent,
    parsedFields,
    missingEssentialFields,
    stage: deriveStage(hasRawContent, parsedFields),
  };
}

function deriveStage(hasRawContent: boolean, parsedFields: ParsedFieldsIndicator): StubStage {
  if (parsedFields === 'complete') return 'parsed-complete';
  if (parsedFields === 'partial') return 'parsed-partial';
  return hasRawContent ? 'raw-content-only' : 'url-only';
}
