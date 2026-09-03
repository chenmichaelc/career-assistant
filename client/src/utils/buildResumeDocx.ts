// client/src/utils/buildResumeDocx.ts

import {
  Document,
  Paragraph,
  TextRun,
  Tab,
  TabStopType,
  TabStopPosition,
  AlignmentType,
  BorderStyle,
  LevelFormat,
  LineRuleType,
} from 'docx';
import type {
  ParsedResume,
  JobEntry,
  ProjectEntry,
  EducationEntry,
  SkillCategory,
} from './parseResumeText';

// ─── Template constants ──────────────────────────────────────────────────────

const FONT = 'Arial';
const COLOR_SECTION_HEADER = '2E75B6';
const COLOR_LOCATION = '555555';

const SIZE_NAME = 36; // 18pt
const SIZE_CONTACT = 19; // 9.5pt
const SIZE_SECTION_HEADER = 22; // 11pt
const SIZE_BODY = 20; // 10pt
const SIZE_JOB_LABEL = 22; // 11pt bold company line — jobs only; projects/education use SIZE_BODY

// 1.15x line spacing
const LINE_SPACING = { line: 276, lineRule: LineRuleType.AUTO };

const BULLET_REFERENCE = 'resume-bullets';

const numberingConfig = {
  config: [
    {
      reference: BULLET_REFERENCE,
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: 360, hanging: 180 },
            },
          },
        },
      ],
    },
  ],
};

const DATE_TAB_STOPS = [
  { type: TabStopType.CLEAR, position: 720 },
  { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
];

function tabRun(): TextRun {
  return new TextRun({ children: [new Tab()] });
}

function emptyParagraph(): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 100, ...LINE_SPACING },
    children: [new TextRun({ text: '', font: FONT, size: SIZE_BODY })],
  });
}

// ─── Paragraph builders ──────────────────────────────────────────────────────

function nameParagraph(name: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 30, ...LINE_SPACING },
    children: [new TextRun({ text: name, bold: true, font: FONT, size: SIZE_NAME })],
  });
}

function contactParagraph(contactLine: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120, ...LINE_SPACING },
    children: [new TextRun({ text: contactLine, font: FONT, size: SIZE_CONTACT })],
  });
}

function sectionHeaderParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 60, ...LINE_SPACING },
    border: {
      bottom: { style: BorderStyle.SINGLE, color: COLOR_SECTION_HEADER, size: 6, space: 1 },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        font: FONT,
        size: SIZE_SECTION_HEADER,
        color: COLOR_SECTION_HEADER,
      }),
    ],
  });
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 120, ...LINE_SPACING },
    children: [new TextRun({ text, font: FONT, size: SIZE_BODY })],
  });
}

// Job entry line: bold company (11pt), muted-color location AND date range
// (both 10pt, color 555555 — the reference colors the whole trailing
// segment, not just the location).
function jobEntryLineParagraph(company: string, location: string, dateRange: string): Paragraph {
  return new Paragraph({
    tabStops: DATE_TAB_STOPS,
    spacing: { before: 100, after: 0, ...LINE_SPACING },
    children: [
      new TextRun({ text: company, bold: true, font: FONT, size: SIZE_JOB_LABEL }),
      new TextRun({ text: `  ${location}`, font: FONT, size: SIZE_BODY, color: COLOR_LOCATION }),
      tabRun(),
      new TextRun({ text: dateRange, font: FONT, size: SIZE_BODY, color: COLOR_LOCATION }),
    ],
  });
}

// Project entry line: bold name (10pt, not 11 — projects are smaller than
// jobs in the reference), italic parenthetical link (not bold), plain date.
function projectEntryLineParagraph(
  name: string,
  link: string | null,
  dateRange: string
): Paragraph {
  const children: TextRun[] = [
    new TextRun({ text: name, bold: true, font: FONT, size: SIZE_BODY }),
  ];
  if (link) {
    children.push(new TextRun({ text: ' ', font: FONT, size: SIZE_BODY }));
    children.push(new TextRun({ text: `(${link})`, italics: true, font: FONT, size: SIZE_BODY }));
  }
  children.push(new TextRun({ text: ' ', font: FONT, size: SIZE_BODY }));
  children.push(tabRun());
  children.push(new TextRun({ text: dateRange, font: FONT, size: SIZE_BODY }));

  return new Paragraph({
    tabStops: DATE_TAB_STOPS,
    spacing: { before: 0, after: 100, ...LINE_SPACING },
    children,
  });
}

// Education entry line: plain (not bold), 10pt — unlike jobs/projects,
// the reference doesn't emphasize the degree/institution line at all.
function educationEntryLineParagraph(label: string, dateRange: string): Paragraph {
  return new Paragraph({
    tabStops: DATE_TAB_STOPS,
    spacing: { before: 60, after: 20, ...LINE_SPACING },
    children: [
      new TextRun({ text: label, font: FONT, size: SIZE_BODY }),
      tabRun(),
      new TextRun({ text: dateRange, font: FONT, size: SIZE_BODY }),
    ],
  });
}

function jobTitleParagraph(title: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60, ...LINE_SPACING },
    children: [new TextRun({ text: title, italics: true, font: FONT, size: SIZE_BODY })],
  });
}

function projectSummaryParagraph(summary: string): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 100, ...LINE_SPACING },
    children: [new TextRun({ text: summary, italics: true, font: FONT, size: SIZE_BODY })],
  });
}

const BULLET_SPACING_AFTER_JOB = 20;
const BULLET_SPACING_AFTER_PROJECT = 14;

// Bullet glyph comes from the numbering level's `text`, rendered by Word's
// own numbering engine — never insert a literal "•" into a TextRun.
//
// spacingAfter is a parameter, not a constant, because the reference
// template uses a tighter value for PROJECTS bullets (14) than EXPERIENCE
// bullets (20) — confirmed across all 3 of the reference's project bullets,
// consistently, so this isn't incidental.
function bulletParagraph(text: string, spacingAfter: number): Paragraph {
  return new Paragraph({
    numbering: { reference: BULLET_REFERENCE, level: 0 },
    spacing: { after: spacingAfter, ...LINE_SPACING },
    children: [new TextRun({ text, font: FONT, size: SIZE_BODY })],
  });
}

// Skill line: bold category name only — the colon and items are plain,
// not part of the bold run.
function skillCategoryParagraph(skill: SkillCategory): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 30, ...LINE_SPACING },
    children: [
      new TextRun({ text: skill.category, bold: true, font: FONT, size: SIZE_BODY }),
      new TextRun({ text: `: ${skill.items.join(', ')}`, font: FONT, size: SIZE_BODY }),
    ],
  });
}

// ─── Section builders ────────────────────────────────────────────────────────

function buildExperienceSection(jobs: readonly JobEntry[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  jobs.forEach((job, index) => {
    if (index > 0) {
      paragraphs.push(emptyParagraph());
    }
    paragraphs.push(jobEntryLineParagraph(job.company, job.location, job.dateRange));
    paragraphs.push(jobTitleParagraph(job.title));
    for (const bullet of job.bullets) {
      paragraphs.push(bulletParagraph(bullet, BULLET_SPACING_AFTER_JOB));
    }
  });
  return paragraphs;
}

function buildProjectsSection(projects: readonly ProjectEntry[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  projects.forEach((project, index) => {
    if (index > 0) {
      paragraphs.push(emptyParagraph());
    }
    paragraphs.push(projectEntryLineParagraph(project.name, project.link, project.dateRange));
    if (project.summary) {
      paragraphs.push(projectSummaryParagraph(project.summary));
    }
    for (const bullet of project.bullets) {
      paragraphs.push(bulletParagraph(bullet, BULLET_SPACING_AFTER_PROJECT));
    }
  });
  return paragraphs;
}

function buildEducationSection(education: readonly EducationEntry[]): Paragraph[] {
  return education.map((entry) =>
    educationEntryLineParagraph(`${entry.degree} — ${entry.institution}`, entry.dateRange)
  );
}

function buildSkillsSection(skills: readonly SkillCategory[]): Paragraph[] {
  return skills.map(skillCategoryParagraph);
}

// ─── Top-level builder ───────────────────────────────────────────────────────

export function buildResumeDocx(resume: ParsedResume): Document {
  const children: Paragraph[] = [nameParagraph(resume.name), contactParagraph(resume.contactLine)];

  // The reference template has an empty paragraph immediately before every
  // section header, with no exceptions — confirmed by checking all 5
  // section headers directly against the reference's raw XML.
  function pushSectionHeader(text: string): void {
    children.push(emptyParagraph());
    children.push(sectionHeaderParagraph(text));
  }

  if (resume.sections.summary) {
    pushSectionHeader('SUMMARY');
    children.push(bodyParagraph(resume.sections.summary));
  }

  if (resume.sections.experience.length > 0) {
    pushSectionHeader('EXPERIENCE');
    children.push(...buildExperienceSection(resume.sections.experience));
  }

  if (resume.sections.projects.length > 0) {
    pushSectionHeader('PROJECTS');
    children.push(...buildProjectsSection(resume.sections.projects));
  }

  if (resume.sections.education.length > 0) {
    pushSectionHeader('EDUCATION');
    children.push(...buildEducationSection(resume.sections.education));
  }

  if (resume.sections.skills.length > 0) {
    pushSectionHeader('SKILLS');
    children.push(...buildSkillsSection(resume.sections.skills));
  }

  return new Document({
    numbering: numberingConfig,
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { left: 864, right: 864, top: 720, bottom: 720 },
          },
        },
        children,
      },
    ],
  });
}
