// client/tests/unit/utils/parseResumeText.test.ts

import { describe, test, expect } from 'vitest';
import { parseResumeText } from '../../../src/utils/parseResumeText';
import { SAMPLE_RESUME } from './fixtures/sampleResume';

describe('parseResumeText — real sample resume', () => {
  test('parses name and contact line', () => {
    const result = parseResumeText(SAMPLE_RESUME);
    expect(result.name).toBe('John H. Watson');
    expect(result.contactLine).toBe(
      'London, UK NW1 6XE  |  +44 20 7946 0958  |  j.watson@bakerstreet.example  |  linkedin.com/in/johnhwatson  |  github.com/jhwatson'
    );
  });

  test('parses the summary as a single paragraph', () => {
    const result = parseResumeText(SAMPLE_RESUME);
    expect(result.sections.summary).not.toBeNull();
    expect(result.sections.summary).toContain('Physician and consulting investigator');
    expect(result.sections.summary).toContain('the casebook.');
  });

  test('parses all 5 experience entries, including the pair with no blank line between them', () => {
    const result = parseResumeText(SAMPLE_RESUME);
    expect(result.sections.experience).toHaveLength(5);

    const [currentPractice, laterConsulting, kensingtonPractice, earlyConsulting, army] =
      result.sections.experience;

    expect(currentPractice).toMatchObject({
      company: 'Private Medical Practice',
      location: 'Queen Anne Street, London',
      dateRange: '1902 – Present',
      title: 'General Practitioner',
    });
    expect(currentPractice.bullets).toHaveLength(3);

    expect(laterConsulting.company).toBe('Holmes Consulting');
    expect(laterConsulting.location).toBe('221B Baker Street, London');
    expect(laterConsulting.bullets).toHaveLength(4);

    expect(kensingtonPractice.title).toBe('General Practitioner');
    expect(kensingtonPractice.bullets).toHaveLength(2);

    expect(earlyConsulting).toMatchObject({
      company: 'Holmes Consulting',
      location: '221B Baker Street, London',
      dateRange: '1881 – 1891',
      title: 'Consulting Partner & Case Chronicler',
    });
    expect(earlyConsulting.bullets).toHaveLength(8);

    expect(army.company).toBe('5th Northumberland Fusiliers');
    expect(army.title).toBe('Assistant Surgeon');
    expect(army.bullets).toHaveLength(4);
  });

  test('parses the one project entry, splitting the parenthetical link from the name', () => {
    const result = parseResumeText(SAMPLE_RESUME);
    expect(result.sections.projects).toHaveLength(1);
    expect(result.sections.projects[0]).toMatchObject({
      name: 'the-strand-digital',
      link: 'github.com/jhwatson/the-strand-digital',
      dateRange: '2026 – Present',
    });
    expect(result.sections.projects[0].bullets).toHaveLength(5);
  });

  test('parses both education entries, including the pair with no blank line between them', () => {
    const result = parseResumeText(SAMPLE_RESUME);
    expect(result.sections.education).toHaveLength(2);
    expect(result.sections.education[0]).toEqual({
      degree: 'Doctor of Medicine',
      institution: 'University of London',
      dateRange: '1877 – 1878',
    });
    expect(result.sections.education[1]).toEqual({
      degree: 'Bachelor of Medicine & Bachelor of Surgery',
      institution: "St. Bartholomew's Hospital Medical College",
      dateRange: '1873 – 1877',
    });
  });

  test('parses all 8 skill categories with comma-separated items', () => {
    const result = parseResumeText(SAMPLE_RESUME);
    expect(result.sections.skills).toHaveLength(8);
    expect(result.sections.skills[0]).toEqual({
      category: 'Clinical Medicine',
      items: [
        'General surgery',
        'battlefield trauma care',
        'wound assessment',
        'diagnosis',
        'minor procedures',
        'prescribing',
      ],
    });
    // Category names containing "&" must not confuse comma-splitting logic.
    expect(result.sections.skills[1].category).toBe('Forensic & Investigative Methods');
    expect(result.sections.skills[1].items).toEqual([
      'Cause-of-death assessment',
      'poison and toxicology identification',
      'physical evidence review',
      'deductive reasoning',
      'crime-scene observation',
    ]);
  });
});

describe('parseResumeText — edge cases', () => {
  test('a missing section is an empty array/null, not a thrown error', () => {
    const textWithNoProjects = `Jane Doe
jane@example.com

EXPERIENCE
Acme Corp  Remote\t01/2020 – Present
Engineer
    • Did engineering things.

EDUCATION
Bachelor of Science — State University\t2016 – 2020`;

    const result = parseResumeText(textWithNoProjects);
    expect(result.sections.projects).toEqual([]);
    expect(result.sections.summary).toBeNull();
    expect(result.sections.skills).toEqual([]);
    expect(result.sections.experience).toHaveLength(1);
    expect(result.sections.education).toHaveLength(1);
  });

  test('a job entry with no bullet lines gets an empty bullets array', () => {
    const textWithNoBullets = `Jane Doe
jane@example.com

EXPERIENCE
Acme Corp  Remote\t01/2020 – Present
Engineer
Beta Corp  Remote\t01/2018 – 01/2020
Junior Engineer
    • Had one bullet here.`;

    const result = parseResumeText(textWithNoBullets);
    expect(result.sections.experience).toHaveLength(2);
    expect(result.sections.experience[0].bullets).toEqual([]);
    expect(result.sections.experience[1].bullets).toEqual(['Had one bullet here.']);
  });

  test('a bullet prefixed with "-" instead of "•" is still recognized', () => {
    const textWithDashBullets = `Jane Doe
jane@example.com

EXPERIENCE
Acme Corp  Remote\t01/2020 – Present
Engineer
    - Did engineering things with a dash bullet.`;

    const result = parseResumeText(textWithDashBullets);
    expect(result.sections.experience[0].bullets).toEqual([
      'Did engineering things with a dash bullet.',
    ]);
  });

  test('empty input does not throw and returns an all-empty structure', () => {
    const result = parseResumeText('');
    expect(result.name).toBe('');
    expect(result.contactLine).toBe('');
    expect(result.sections).toEqual({
      summary: null,
      experience: [],
      projects: [],
      education: [],
      skills: [],
    });
  });

  test('an entry line separated by 2+ spaces instead of a tab is still recognized', () => {
    const textWithSpaceDelimitedProject = `Jane Doe
jane@example.com

PROJECTS
side-project (github.com/jane/side-project)  2023 – Present
    • Built something.`;

    const result = parseResumeText(textWithSpaceDelimitedProject);
    expect(result.sections.projects).toHaveLength(1);
    expect(result.sections.projects[0]).toMatchObject({
      name: 'side-project',
      link: 'github.com/jane/side-project',
      dateRange: '2023 – Present',
    });
    expect(result.sections.projects[0].bullets).toEqual(['Built something.']);
  });

  test('a company/location line with an internal 2+ space gap is not mistaken for the date separator', () => {
    const textWithEarlyDoubleSpace = `Jane Doe
jane@example.com

EXPERIENCE
Acme  Remote  2020 – Present
Engineer
    • Did a thing.`;

    const result = parseResumeText(textWithEarlyDoubleSpace);
    expect(result.sections.experience).toHaveLength(1);
    expect(result.sections.experience[0]).toMatchObject({
      company: 'Acme',
      location: 'Remote',
      dateRange: '2020 – Present',
    });
  });

  test('a bullet with a coincidental double-space and an en dash is not misread as a new entry', () => {
    const textWithTrickyBullet = `Jane Doe
jane@example.com

EXPERIENCE
Acme Corp  Remote\t2020 – Present
Engineer
    • Reduced spend  significantly – a major win.
    • A second, ordinary bullet.`;

    const result = parseResumeText(textWithTrickyBullet);
    expect(result.sections.experience).toHaveLength(1);
    expect(result.sections.experience[0].bullets).toEqual([
      'Reduced spend  significantly – a major win.',
      'A second, ordinary bullet.',
    ]);
  });
});
