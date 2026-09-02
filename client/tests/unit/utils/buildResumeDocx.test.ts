// client/tests/unit/utils/buildResumeDocx.test.ts

import { describe, test, expect, beforeAll } from 'vitest';
import { Packer } from 'docx';
import JSZip from 'jszip';
import { buildResumeDocx } from '../../../src/utils/buildResumeDocx';
import type { ParsedResume } from '../../../src/utils/parseResumeText';
import { BUILD_RESUME_DOCX_FIXTURE } from '../../fixtures/buildResumeDocx.fixture';

let documentXml: string;
let numberingXml: string;

beforeAll(async () => {
  const doc = buildResumeDocx(BUILD_RESUME_DOCX_FIXTURE);
  const buffer = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buffer);
  documentXml = await zip.file('word/document.xml')!.async('string');
  numberingXml = await zip.file('word/numbering.xml')!.async('string');
});

describe('buildResumeDocx — page setup', () => {
  test('US Letter page size and reference margins are set explicitly', () => {
    expect(documentXml).toContain('w:w="12240"');
    expect(documentXml).toContain('w:h="15840"');
    expect(documentXml).toContain('w:top="720"');
    expect(documentXml).toContain('w:right="864"');
    expect(documentXml).toContain('w:bottom="720"');
    expect(documentXml).toContain('w:left="864"');
  });
});

describe('buildResumeDocx — name and contact header', () => {
  test('name is bold, centered, 18pt (sz=36)', () => {
    const nameParagraph = extractParagraph(documentXml, 'John H. Watson');
    expect(nameParagraph).toContain('<w:b/>');
    expect(nameParagraph).toContain('w:val="center"');
    expect(nameParagraph).toContain('w:sz w:val="36"');
  });

  test('contact line is centered, 9.5pt (sz=19), not bold', () => {
    const contactParagraph = extractParagraph(documentXml, 'j.watson@bakerstreet.example');
    expect(contactParagraph).toContain('w:val="center"');
    expect(contactParagraph).toContain('w:sz w:val="19"');
    expect(contactParagraph).not.toContain('<w:b/>');
  });
});

describe('buildResumeDocx — section headers', () => {
  test('all 5 section headers appear, in order, bold with the reference blue and a bottom border', () => {
    const expectedOrder = ['SUMMARY', 'EXPERIENCE', 'PROJECTS', 'EDUCATION', 'SKILLS'];
    const positions = expectedOrder.map((header) => documentXml.indexOf(`>${header}<`));

    expect(positions.every((pos) => pos !== -1)).toBe(true);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }

    for (const header of expectedOrder) {
      const headerParagraph = extractParagraph(documentXml, header);
      expect(headerParagraph).toContain('<w:b/>');
      expect(headerParagraph).toContain('w:color w:val="2E75B6"');
      expect(headerParagraph).toContain('w:sz w:val="22"');
      expect(headerParagraph).toContain('<w:bottom w:val="single" w:color="2E75B6" w:sz="6"');
    }
  });
});

describe('buildResumeDocx — experience entries', () => {
  test('job entry line: bold company (sz=22), muted-color location AND date range, declared right tab stop', () => {
    const entryParagraph = extractParagraph(documentXml, 'Holmes Consulting');
    expect(entryParagraph).toContain('<w:b/>');
    expect(entryParagraph).toContain('w:sz w:val="22"');
    expect(entryParagraph).toContain('221B Baker Street, London');
    const colorMatches = entryParagraph.match(/w:color w:val="555555"/g) ?? [];
    expect(colorMatches.length).toBe(2);
    expect(entryParagraph).toContain('<w:tab w:val="clear" w:pos="720"/>');
    expect(entryParagraph).toContain('<w:tab w:val="right" w:pos="9026"/>');
    expect(entryParagraph).toContain('<w:tab/>');
    expect(entryParagraph).not.toContain('w:ptab');
    expect(entryParagraph).toContain('1881');
  });

  test('job title line is italic, 10pt (sz=20), not bold', () => {
    const titleParagraph = extractParagraph(documentXml, 'Consulting Partner and Case Chronicler');
    expect(titleParagraph).toContain('<w:i/>');
    expect(titleParagraph).toContain('w:sz w:val="20"');
    expect(titleParagraph).not.toContain('<w:b/>');
  });

  test('each job entry produces entry-line + title-line + one paragraph per bullet, in that order', () => {
    const holmesConsultingIdx = documentXml.indexOf('>Holmes Consulting<');
    const titleIdx = documentXml.indexOf('Consulting Partner and Case Chronicler');
    const bullet1Idx = documentXml.indexOf('Assisted with a case.');
    const bullet2Idx = documentXml.indexOf('Documented the investigation.');
    expect(holmesConsultingIdx).toBeLessThan(titleIdx);
    expect(titleIdx).toBeLessThan(bullet1Idx);
    expect(bullet1Idx).toBeLessThan(bullet2Idx);
  });

  test('bullets use numbering (numPr/ListParagraph) with the reference hanging indent, never a literal bullet character in the run text', () => {
    const bulletParagraph = extractParagraph(documentXml, 'Assisted with a case.');
    expect(bulletParagraph).toContain('w:pStyle w:val="ListParagraph"');
    expect(bulletParagraph).toContain('<w:numPr>');
    expect(bulletParagraph).not.toContain('•');
    expect(bulletParagraph).toContain('w:after="20"');

    expect(numberingXml).toContain('w:lvlText w:val="•"');
    expect(numberingXml).toContain('w:ind w:left="360" w:hanging="180"');
  });
});

describe('buildResumeDocx — projects and education', () => {
  test('project entry: bold name (10pt, not 11 — smaller than job entries), italic parenthetical link, plain date', () => {
    const projectParagraph = extractParagraph(documentXml, 'the-strand-digital');
    expect(projectParagraph).toContain('<w:b/>');
    expect(projectParagraph).toContain('<w:i/>');
    expect(projectParagraph).toContain('(github.com/jhwatson/the-strand-digital)');
    expect(projectParagraph).not.toContain('w:sz w:val="22"');
    expect(projectParagraph).toContain('<w:tab w:val="right" w:pos="9026"/>');
    expect(projectParagraph).not.toContain('w:ptab');
    expect(projectParagraph).toContain('2026');
  });

  test('project summary line is italic, 10pt (sz=20), not bold', () => {
    const summaryParagraph = extractParagraph(
      documentXml,
      'Personal side project chronicling investigations for serialized publication in The Strand Magazine.'
    );
    expect(summaryParagraph).toContain('<w:i/>');
    expect(summaryParagraph).toContain('w:sz w:val="20"');
    expect(summaryParagraph).not.toContain('<w:b/>');
  });

  test('each project entry produces entry-line + summary-line + one paragraph per bullet, in that order', () => {
    const entryLineIdx = documentXml.indexOf('>the-strand-digital<');
    const summaryIdx = documentXml.indexOf(
      'Personal side project chronicling investigations for serialized publication in The Strand Magazine.'
    );
    const bulletIdx = documentXml.indexOf('Built something.');
    expect(entryLineIdx).toBeLessThan(summaryIdx);
    expect(summaryIdx).toBeLessThan(bulletIdx);
  });

  test('project bullets use tighter spacing (after=14) than job bullets (after=20)', () => {
    const projectBulletParagraph = extractParagraph(documentXml, 'Built something.');
    expect(projectBulletParagraph).toContain('w:pStyle w:val="ListParagraph"');
    expect(projectBulletParagraph).toContain('w:after="14"');
  });

  test('education entry: plain (not bold) "degree — institution" label at 10pt, date flush right', () => {
    const educationParagraph = extractParagraph(documentXml, 'Doctor of Medicine');
    expect(educationParagraph).not.toContain('<w:b/>');
    expect(educationParagraph).not.toContain('w:sz w:val="22"');
    expect(educationParagraph).toContain('Doctor of Medicine — University of London');
    expect(educationParagraph).toContain('<w:tab w:val="right" w:pos="9026"/>');
    expect(educationParagraph).not.toContain('w:ptab');
    expect(educationParagraph).toContain('1877');
  });
});

describe('buildResumeDocx — skills', () => {
  test('skill category label is bold, colon and items are not (bold does not extend past the category name)', () => {
    const skillParagraph = extractParagraph(documentXml, 'Clinical Medicine');
    expect(skillParagraph).toContain('<w:b/>');
    expect(skillParagraph).toContain('Surgery, Diagnosis');
    const boldRunMatch = skillParagraph.match(/<w:b\/>.*?<w:t[^>]*>([^<]*)<\/w:t>/);
    expect(boldRunMatch?.[1]).toBe('Clinical Medicine');
    expect(skillParagraph).toContain('w:after="30" w:before="0"');
  });
});

describe('buildResumeDocx — blank paragraph before every section header', () => {
  function hasEmptySpacerBefore(xml: string, header: string): boolean {
    const headerIdx = xml.indexOf(`>${header}<`);
    const headerParaStart = xml.lastIndexOf('<w:p>', headerIdx);
    const precedingEnd = xml.lastIndexOf('</w:p>', headerParaStart);
    const precedingStart = xml.lastIndexOf('<w:p>', precedingEnd);
    const precedingParagraph = xml.slice(precedingStart, precedingEnd + '</w:p>'.length);
    const textMatches = precedingParagraph.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? [];
    const hasVisibleText = textMatches.some((match) => />([^<]+)</.test(match));
    return !hasVisibleText;
  }

  test('RENDER_ONLY_RESUME gets a spacer before all 5 headers, regardless of what precedes them', () => {
    for (const header of ['SUMMARY', 'EXPERIENCE', 'PROJECTS', 'EDUCATION', 'SKILLS']) {
      expect(hasEmptySpacerBefore(documentXml, header)).toBe(true);
    }
  });

  test('the spacer appears even when a section ends in bullets (not just the bulletless-entry case)', () => {
    expect(hasEmptySpacerBefore(documentXml, 'PROJECTS')).toBe(true);
    expect(hasEmptySpacerBefore(documentXml, 'EDUCATION')).toBe(true);
  });
});

describe('buildResumeDocx — blank paragraph between individual entries within a section', () => {
  function countParagraphsBetween(xml: string, startMarker: string, endMarker: string): number {
    const startIdx = xml.indexOf(startMarker);
    const endIdx = xml.indexOf(endMarker);
    const between = xml.slice(startIdx, endIdx);
    return (between.match(/<w:p>/g) ?? []).length;
  }

  test('EXPERIENCE: a blank paragraph separates consecutive jobs, but not before the first one', async () => {
    const resume: ParsedResume = {
      name: 'Test Person',
      contactLine: 'test@example.com',
      sections: {
        summary: null,
        experience: [
          {
            company: 'Job One',
            location: 'Remote',
            dateRange: '2022 – Present',
            title: 'Engineer',
            bullets: ['Bullet A.'],
          },
          {
            company: 'Job Two',
            location: 'Remote',
            dateRange: '2020 – 2022',
            title: 'Junior Engineer',
            bullets: ['Bullet B.'],
          },
        ],
        projects: [],
        education: [],
        skills: [],
      },
    };
    const doc = buildResumeDocx(resume);
    const buffer = await Packer.toBuffer(doc);
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')!.async('string');

    expect(countParagraphsBetween(xml, '>Job One<', '>Job Two<')).toBe(4);
    expect(countParagraphsBetween(xml, '>EXPERIENCE<', '>Job One<')).toBe(1);
  });

  test('PROJECTS: a blank paragraph separates consecutive projects, but not before the first one', async () => {
    const resume: ParsedResume = {
      name: 'Test Person',
      contactLine: 'test@example.com',
      sections: {
        summary: null,
        experience: [],
        projects: [
          { name: 'Proj One', link: null, dateRange: '2023', summary: null, bullets: ['Did X.'] },
          { name: 'Proj Two', link: null, dateRange: '2022', summary: null, bullets: ['Did Y.'] },
        ],
        education: [],
        skills: [],
      },
    };
    const doc = buildResumeDocx(resume);
    const buffer = await Packer.toBuffer(doc);
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')!.async('string');

    expect(countParagraphsBetween(xml, '>Proj One<', '>Proj Two<')).toBe(3);
    expect(countParagraphsBetween(xml, '>PROJECTS<', '>Proj One<')).toBe(1);
  });

  test('no double blank paragraph where a between-entries spacer and a between-sections spacer would otherwise both apply', async () => {
    const resume: ParsedResume = {
      name: 'Test Person',
      contactLine: 'test@example.com',
      sections: {
        summary: null,
        experience: [
          {
            company: 'Job One',
            location: 'Remote',
            dateRange: '2022 – Present',
            title: 'Engineer',
            bullets: [],
          },
          {
            company: 'Job Last',
            location: 'Remote',
            dateRange: '2018 – 2020',
            title: 'Intern',
            bullets: [],
          },
        ],
        projects: [{ name: 'Proj One', link: null, dateRange: '2023', summary: null, bullets: [] }],
        education: [],
        skills: [],
      },
    };
    const doc = buildResumeDocx(resume);
    const buffer = await Packer.toBuffer(doc);
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')!.async('string');

    expect(countParagraphsBetween(xml, '>Job Last<', '>PROJECTS<')).toBe(3);
  });

  test('EDUCATION does not get a blank paragraph between its entries — not part of this request', async () => {
    const resume: ParsedResume = {
      name: 'Test Person',
      contactLine: 'test@example.com',
      sections: {
        summary: null,
        experience: [],
        projects: [],
        education: [
          { degree: 'MA', institution: 'University A', dateRange: '2006 – 2007' },
          { degree: 'BA', institution: 'University B', dateRange: '2001 – 2005' },
        ],
        skills: [],
      },
    };
    const doc = buildResumeDocx(resume);
    const buffer = await Packer.toBuffer(doc);
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')!.async('string');

    expect(countParagraphsBetween(xml, 'MA — University A', 'BA — University B')).toBe(1);
  });
});

describe('buildResumeDocx — omitted sections', () => {
  test('a resume with no projects/education/skills produces no headers or content for them', async () => {
    const minimalResume: ParsedResume = {
      name: 'Jane Doe',
      contactLine: 'jane@example.com',
      sections: {
        summary: null,
        experience: [
          {
            company: 'Acme',
            location: 'Remote',
            dateRange: '2020 – 2021',
            title: 'Engineer',
            bullets: [],
          },
        ],
        projects: [],
        education: [],
        skills: [],
      },
    };

    const doc = buildResumeDocx(minimalResume);
    const buffer = await Packer.toBuffer(doc);
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')!.async('string');

    expect(xml).not.toContain('>SUMMARY<');
    expect(xml).not.toContain('>PROJECTS<');
    expect(xml).not.toContain('>EDUCATION<');
    expect(xml).not.toContain('>SKILLS<');
    expect(xml).toContain('>EXPERIENCE<');
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function extractParagraph(xml: string, marker: string): string {
  const markerIndex = xml.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Marker "${marker}" not found in document XML`);
  }
  const paragraphStart = xml.lastIndexOf('<w:p>', markerIndex);
  const paragraphEnd = xml.indexOf('</w:p>', markerIndex) + '</w:p>'.length;
  return xml.slice(paragraphStart, paragraphEnd);
}
