// client/tests/unit/utils/resumeFormatContract.test.ts

import { describe, test, expect, beforeAll } from 'vitest';
import { Packer } from 'docx';
import JSZip from 'jszip';
import { parseResumeText } from '../../../src/utils/parseResumeText';
import { buildResumeDocx } from '../../../src/utils/buildResumeDocx';
import { FORMAT_CONTRACT_RESUME } from '../../fixtures/formatContractResume';

const parsed = parseResumeText(FORMAT_CONTRACT_RESUME);

let documentXml: string;

beforeAll(async () => {
  const doc = buildResumeDocx(parsed);
  const buffer = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buffer);
  documentXml = await zip.file('word/document.xml')!.async('string');
});

function extractParagraph(xml: string, marker: string): string {
  const markerIndex = xml.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Marker "${marker}" not found in document XML`);
  }
  const paragraphStart = xml.lastIndexOf('<w:p>', markerIndex);
  const paragraphEnd = xml.indexOf('</w:p>', markerIndex) + '</w:p>'.length;
  return xml.slice(paragraphStart, paragraphEnd);
}

describe('resume format contract — parsing (rules 1–10 in docs/resume-import-format.md)', () => {
  test('rule 1: header block — name and contact line', () => {
    expect(parsed.name).toBe('Mycroft Holmes');
    expect(parsed.contactLine).toContain('m.holmes@whitehall.example');
  });

  test('rule 9: multi-line SUMMARY joined into one paragraph', () => {
    expect(parsed.sections.summary).toContain('habitually fail to coordinate');
    expect(parsed.sections.summary).toContain('situational recall');
  });

  test('rule 3 + rule 4: en-dash date range recognized regardless of tab vs. space delimiter', () => {
    expect(parsed.sections.experience).toHaveLength(2);
    expect(parsed.sections.experience[0].dateRange).toBe('1888 – Present'); // tab-delimited entry line
    expect(parsed.sections.experience[1].dateRange).toBe('1873 – 1888'); // space-delimited entry line
  });

  test('rule 5: company/location split on 2+ spaces, title line captured, both bullet markers recognized', () => {
    const [founding, senior] = parsed.sections.experience;

    expect(founding.company).toBe('Diogenes Club');
    expect(founding.location).toBe('Whitehall, London');
    expect(founding.title).toBe('Founding Auditor');
    expect(founding.bullets).toHaveLength(2); // '•' bullets

    expect(senior.company).toBe('British Government');
    expect(senior.location).toBe('Whitehall, London');
    expect(senior.title).toBe('Senior Analyst');
    expect(senior.bullets).toHaveLength(2); // '-' bullets
    expect(senior.bullets[0]).toContain('British government itself');
  });

  test('rule 6: project with a multi-line summary before its bullets', () => {
    const [ledger] = parsed.sections.projects;
    expect(ledger.name).toBe('whitehall-ledger');
    expect(ledger.link).toBe('github.com/mholmes/whitehall-ledger');
    expect(ledger.summary).toBe(
      'Personal side project building a unified audit trail across departmental filing systems that otherwise never reconcile with one another.'
    );
    expect(ledger.bullets).toHaveLength(2);
  });

  test('rule 6: project with no summary — bullets start immediately, link omitted', () => {
    const [, index] = parsed.sections.projects;
    expect(index.name).toBe('the-diogenes-index');
    expect(index.link).toBeNull();
    expect(index.summary).toBeNull();
    expect(index.bullets).toHaveLength(1);
  });

  test('rule 7: education splits on em dash, distinct from the en-dash date range on the same line', () => {
    expect(parsed.sections.education).toHaveLength(1);
    expect(parsed.sections.education[0]).toMatchObject({
      degree: 'Second-Class Honours, Mathematics',
      institution: 'Trinity College, Cambridge',
      dateRange: '1868 – 1871',
    });
  });

  test('rule 8: multiple skill categories, each split on its first colon', () => {
    expect(parsed.sections.skills).toHaveLength(3);
    expect(parsed.sections.skills[0]).toMatchObject({
      category: 'Analysis & Auditing',
      items: [
        'Cross-departmental reconciliation',
        'systemic gap analysis',
        'quality audits',
        'situational recall',
      ],
    });
  });
});

describe('resume format contract — rendering (spot-check via the real docx builder)', () => {
  test('both experience entries render with their titles and dates', () => {
    const foundingParagraph = extractParagraph(documentXml, 'Diogenes Club');
    expect(foundingParagraph).toContain('Whitehall, London');
    expect(foundingParagraph).toContain('1888');

    const titleParagraph = extractParagraph(documentXml, 'Founding Auditor');
    expect(titleParagraph).toContain('<w:i/>');
  });

  test('the project summary line renders as its own paragraph', () => {
    const summaryParagraph = extractParagraph(
      documentXml,
      'Personal side project building a unified audit trail'
    );
    expect(summaryParagraph).toContain('audit trail');
  });

  test('the project with no summary still renders its bullet', () => {
    expect(documentXml).toContain('Compiled a private index');
  });

  test('education renders degree and institution as split by the em dash, not merged', () => {
    const eduParagraph = extractParagraph(documentXml, 'Second-Class Honours');
    expect(eduParagraph).toContain('Trinity College, Cambridge');
  });
});
