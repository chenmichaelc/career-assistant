// lib/parse-records.ts
// Career Assistant — Notes file parser
// Pure function: takes a raw notes file string, returns an array of role field objects.
// No DB dependency. No I/O.

import { RoleStatus } from './types';

export interface ParsedRecord {
  company:     string | null;
  title:       string | null;
  url:         string | null;
  role_status: RoleStatus;
  salary_min:  number | null;
  salary_max:  number | null;
  jd:          string | null;
  candidacy:   null;
  notes:       null;
  _startLine:  number;
}

export function parseRecords(text: string): ParsedRecord[] {
  const lines:   string[]        = text.split('\n');
  const records: ParsedRecord[]  = [];

  let current:   ParsedRecord | null = null;
  let startLine: number              = 1;
  let lineNumber: number             = 0;
  let inJd:      boolean             = false;

  for (const line of lines) {
    lineNumber++;

    if (line.trim() === '--') {
      if (current !== null) {
        if (current.jd !== null) {
          current.jd = current.jd.trim();
        }
        records.push(current);
      }
      current   = null;
      inJd      = false;
      startLine = lineNumber + 1;
      continue;
    }

    if (current === null) {
      current = {
        company:     null,
        title:       null,
        url:         null,
        role_status: 'Pending Triage',
        salary_min:  null,
        salary_max:  null,
        jd:          null,
        candidacy:   null,
        notes:       null,
        _startLine:  startLine,
      };
    }

    if (inJd) {
      current.jd = (current.jd === null ? '' : current.jd) + line + '\n';
      continue;
    }

    const urlMatch       = line.match(/^URL:\s*(.*)$/i);
    const companyMatch   = line.match(/^Company:\s*(.*)$/i);
    const titleMatch     = line.match(/^Title:\s*(.*)$/i);
    const salaryMinMatch = line.match(/^Salary Min:\s*(.*)$/i);
    const salaryMaxMatch = line.match(/^Salary Max:\s*(.*)$/i);
    const descMatch      = line.match(/^Description:\s*$/i);

    if (urlMatch) {
      const value  = urlMatch[1].trim();
      current.url  = value !== '' ? value : null;
    } else if (companyMatch) {
      const value      = companyMatch[1].trim();
      current.company  = value !== '' ? value : null;
    } else if (titleMatch) {
      const value    = titleMatch[1].trim();
      current.title  = value !== '' ? value : null;
    } else if (salaryMinMatch) {
      const value        = parseInt(salaryMinMatch[1].trim(), 10);
      current.salary_min = isNaN(value) ? null : value;
    } else if (salaryMaxMatch) {
      const value        = parseInt(salaryMaxMatch[1].trim(), 10);
      current.salary_max = isNaN(value) ? null : value;
    } else if (descMatch) {
      inJd       = true;
      current.jd = '';
    }
  }

  if (current !== null) {
    if (current.jd !== null) {
      current.jd = current.jd.trim();
    }
    records.push(current);
  }

  return records;
}
