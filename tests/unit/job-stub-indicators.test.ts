// tests/unit/job-stub-indicators.test.ts
import { describe, test, expect } from 'vitest';
import { deriveStubIndicators, StubIndicatorSource } from '../../lib/job-stub-indicators';

const urlOnlyStub: StubIndicatorSource = {
  raw_content: null,
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

const allEssentialsPopulated: Partial<StubIndicatorSource> = {
  parsed_company: 'Acme',
  parsed_title: 'Engineer',
  parsed_description: 'Builds things.',
};

describe('deriveStubIndicators — raw content', () => {
  test('a stub with only a URL has no raw content', () => {
    expect(deriveStubIndicators(urlOnlyStub).hasRawContent).toBe(false);
  });

  test.each([
    ['an empty string', ''],
    ['whitespace only', '  \n\t '],
  ])('%s does not count as raw content', (_description, rawContent) => {
    const indicators = deriveStubIndicators({ ...urlOnlyStub, raw_content: rawContent });
    expect(indicators.hasRawContent).toBe(false);
  });

  test('non-blank text counts as raw content', () => {
    const indicators = deriveStubIndicators({ ...urlOnlyStub, raw_content: 'Full posting.' });
    expect(indicators.hasRawContent).toBe(true);
  });

  test('raw content is independent of parsed fields', () => {
    const indicators = deriveStubIndicators({ ...urlOnlyStub, ...allEssentialsPopulated });
    expect(indicators.hasRawContent).toBe(false);
    expect(indicators.parsedFields).toBe('complete');
  });
});

describe('deriveStubIndicators — parsed fields', () => {
  test('no parsed field populated is "none", with every essential field missing', () => {
    const indicators = deriveStubIndicators(urlOnlyStub);
    expect(indicators.parsedFields).toBe('none');
    expect(indicators.missingEssentialFields).toEqual(['company', 'title', 'description']);
  });

  test('company, title and description all populated is "complete"', () => {
    const indicators = deriveStubIndicators({ ...urlOnlyStub, ...allEssentialsPopulated });
    expect(indicators.parsedFields).toBe('complete');
    expect(indicators.missingEssentialFields).toEqual([]);
  });

  test('some but not all essentials is "partial", naming exactly the missing ones', () => {
    const indicators = deriveStubIndicators({ ...urlOnlyStub, parsed_title: 'Engineer' });
    expect(indicators.parsedFields).toBe('partial');
    expect(indicators.missingEssentialFields).toEqual(['company', 'description']);
  });

  test('a whitespace-only essential field counts as missing', () => {
    const indicators = deriveStubIndicators({
      ...urlOnlyStub,
      ...allEssentialsPopulated,
      parsed_company: '   ',
    });
    expect(indicators.parsedFields).toBe('partial');
    expect(indicators.missingEssentialFields).toEqual(['company']);
  });

  test('an empty-string field is treated the same as null', () => {
    const indicators = deriveStubIndicators({ ...urlOnlyStub, parsed_company: '' });
    expect(indicators.parsedFields).toBe('none');
  });

  test('a non-essential field alone makes the stub "partial"', () => {
    const indicators = deriveStubIndicators({ ...urlOnlyStub, parsed_location: 'Remote - US' });
    expect(indicators.parsedFields).toBe('partial');
    expect(indicators.missingEssentialFields).toEqual(['company', 'title', 'description']);
  });

  test('a salary alone makes the stub "partial", including zero', () => {
    const indicators = deriveStubIndicators({ ...urlOnlyStub, parsed_salary_min: 0 });
    expect(indicators.parsedFields).toBe('partial');
  });

  test.each([
    ['an empty array', '[]'],
    ['an empty array with inner whitespace', '[ ]'],
  ])('%s in skip reasons does not count as a populated field', (_description, skipReasons) => {
    const indicators = deriveStubIndicators({ ...urlOnlyStub, parsed_skip_reasons: skipReasons });
    expect(indicators.parsedFields).toBe('none');
  });

  test('a non-empty skip reason list counts as a populated field', () => {
    const indicators = deriveStubIndicators({
      ...urlOnlyStub,
      parsed_skip_reasons: JSON.stringify([{ reason: 'Location', note: null }]),
    });
    expect(indicators.parsedFields).toBe('partial');
  });

  test('unparseable reason text still counts as populated rather than being dropped', () => {
    const indicators = deriveStubIndicators({
      ...urlOnlyStub,
      parsed_termination_reasons: 'not json',
    });
    expect(indicators.parsedFields).toBe('partial');
  });
});

describe('deriveStubIndicators — stage', () => {
  test('URL only is "url-only"', () => {
    expect(deriveStubIndicators(urlOnlyStub).stage).toBe('url-only');
  });

  test('raw content with nothing parsed is "raw-content-only"', () => {
    const indicators = deriveStubIndicators({ ...urlOnlyStub, raw_content: 'Full posting.' });
    expect(indicators.stage).toBe('raw-content-only');
  });

  test('partially parsed is "parsed-partial", with or without raw content', () => {
    const parsedTitleOnly = { ...urlOnlyStub, parsed_title: 'Engineer' };
    expect(deriveStubIndicators(parsedTitleOnly).stage).toBe('parsed-partial');
    expect(deriveStubIndicators({ ...parsedTitleOnly, raw_content: 'Posting.' }).stage).toBe(
      'parsed-partial'
    );
  });

  test('complete essentials is "parsed-complete", with or without raw content', () => {
    const essentialsParsed = { ...urlOnlyStub, ...allEssentialsPopulated };
    expect(deriveStubIndicators(essentialsParsed).stage).toBe('parsed-complete');
    expect(deriveStubIndicators({ ...essentialsParsed, raw_content: 'Posting.' }).stage).toBe(
      'parsed-complete'
    );
  });
});
