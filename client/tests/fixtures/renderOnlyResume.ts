// client/tests/fixtures/renderOnlyResume.ts

import type { ParsedResume } from '../../src/utils/parseResumeText';

export const RENDER_ONLY_RESUME: ParsedResume = {
  name: 'John H. Watson',
  contactLine: 'London, UK NW1 6XE  |  +44 20 7946 0958  |  j.watson@bakerstreet.example',
  sections: {
    summary: 'Physician and consulting investigator with 20+ years of experience.',
    experience: [
      {
        company: 'Holmes Consulting',
        location: '221B Baker Street, London',
        dateRange: '1881 – 1891',
        title: 'Consulting Partner and Case Chronicler',
        bullets: ['Assisted with a case.', 'Documented the investigation.'],
      },
      {
        company: 'Private Medical Practice',
        location: 'Kensington, London',
        dateRange: '1891 – 1894',
        title: 'General Practitioner',
        bullets: [
          "Purchased and operated an independent practice following a colleague's presumed death, maintaining a stable patient roster.",
        ],
      },
    ],
    projects: [
      {
        name: 'the-strand-digital',
        link: 'github.com/jhwatson/the-strand-digital',
        dateRange: '2026 – Present',
        summary:
          'Personal side project chronicling investigations for serialized publication in The Strand Magazine.',
        bullets: ['Built something.'],
      },
    ],
    education: [
      {
        degree: 'Doctor of Medicine',
        institution: 'University of London',
        dateRange: '1877 – 1878',
      },
    ],
    skills: [{ category: 'Clinical Medicine', items: ['Surgery', 'Diagnosis'] }],
  },
};
