// client/src/utils/parseResumeText.ts

export interface JobEntry {
  company: string;
  location: string;
  dateRange: string;
  title: string;
  bullets: string[];
}

export interface ProjectEntry {
  name: string;
  link: string | null;
  dateRange: string;
  bullets: string[];
}

export interface EducationEntry {
  degree: string;
  institution: string;
  dateRange: string;
}

export interface SkillCategory {
  category: string;
  items: string[];
}

export interface ParsedResume {
  name: string;
  contactLine: string;
  sections: {
    summary: string | null;
    experience: JobEntry[];
    projects: ProjectEntry[];
    education: EducationEntry[];
    skills: SkillCategory[];
  };
}

const SECTION_HEADERS = ['SUMMARY', 'EXPERIENCE', 'PROJECTS', 'EDUCATION', 'SKILLS'] as const;
type SectionHeader = (typeof SECTION_HEADERS)[number];

function isSectionHeader(line: string): line is SectionHeader {
  return (SECTION_HEADERS as readonly string[]).includes(line.trim());
}

// Detects entries by shape (label + tab(s) + date range), not blank-line
// separation, since real input has inconsistent blank-line spacing.
const ENTRY_LINE = /^(.*?)\t+(.+–.+)$/;

function isBulletLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('•') || trimmed.startsWith('-');
}

function stripBulletMarker(line: string): string {
  return line.trim().replace(/^[•-]\s*/, '');
}

export function parseResumeText(text: string): ParsedResume {
  const lines = text.split('\n');

  const name = (lines[0] ?? '').trim();
  const contactLine = (lines[1] ?? '').trim();

  const sections: ParsedResume['sections'] = {
    summary: null,
    experience: [],
    projects: [],
    education: [],
    skills: [],
  };

  let currentSection: SectionHeader | null = null;
  const summaryLines: string[] = [];

  let currentJob: JobEntry | null = null;
  let currentProject: ProjectEntry | null = null;

  function flushJob(): void {
    if (currentJob !== null) sections.experience.push(currentJob);
    currentJob = null;
  }
  function flushProject(): void {
    if (currentProject !== null) sections.projects.push(currentProject);
    currentProject = null;
  }

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '');
    const trimmed = line.trim();

    if (trimmed === '') continue;

    if (isSectionHeader(line)) {
      flushJob();
      flushProject();
      currentSection = trimmed as SectionHeader;
      continue;
    }

    if (currentSection === 'SUMMARY') {
      summaryLines.push(trimmed);
      continue;
    }

    if (currentSection === 'EXPERIENCE') {
      const entryMatch = line.match(ENTRY_LINE);
      if (entryMatch) {
        flushJob();
        const [, companyLocation, dateRange] = entryMatch;
        const parts = companyLocation.trim().split(/\s{2,}/);
        const location = parts.length > 1 ? parts[parts.length - 1] : '';
        const company = (parts.length > 1 ? parts.slice(0, -1) : parts).join('  ').trim();
        currentJob = { company, location, dateRange: dateRange.trim(), title: '', bullets: [] };
        continue;
      }
      if (currentJob !== null && currentJob.title === '') {
        currentJob.title = trimmed;
        continue;
      }
      if (currentJob !== null && isBulletLine(line)) {
        currentJob.bullets.push(stripBulletMarker(line));
      }
      continue;
    }

    if (currentSection === 'PROJECTS') {
      const entryMatch = line.match(ENTRY_LINE);
      if (entryMatch) {
        flushProject();
        const [, nameAndLink, dateRange] = entryMatch;
        const linkMatch = nameAndLink.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
        const projectName = linkMatch ? linkMatch[1].trim() : nameAndLink.trim();
        const link = linkMatch ? linkMatch[2].trim() : null;
        currentProject = { name: projectName, link, dateRange: dateRange.trim(), bullets: [] };
        continue;
      }
      if (currentProject !== null && isBulletLine(line)) {
        currentProject.bullets.push(stripBulletMarker(line));
      }
      continue;
    }

    if (currentSection === 'EDUCATION') {
      const entryMatch = line.match(ENTRY_LINE);
      if (entryMatch) {
        const [, degreeInstitution, dateRange] = entryMatch;
        // Degree and institution are separated by an em dash (U+2014) —
        // distinct from the en dash used in date ranges.
        const [degreePart, institutionPart] = degreeInstitution.split('—');
        sections.education.push({
          degree: (degreePart ?? '').trim(),
          institution: (institutionPart ?? '').trim(),
          dateRange: dateRange.trim(),
        });
      }
      continue;
    }

    if (currentSection === 'SKILLS') {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      const category = line.slice(0, colonIndex).trim();
      const items = line
        .slice(colonIndex + 1)
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '');
      sections.skills.push({ category, items });
    }
  }

  flushJob();
  flushProject();

  if (summaryLines.length > 0) {
    sections.summary = summaryLines.join(' ').trim();
  }

  return { name, contactLine, sections };
}
