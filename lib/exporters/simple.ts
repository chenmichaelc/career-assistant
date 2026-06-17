// lib/exporters/simple.ts
// Career Assistant — Simple export format
// Outputs Company, Title, and JD only.
// Intended for pasting into Claude for triage or review.

import { RoleRow } from '../types';

export function simpleExport(role: RoleRow): string {
  const lines: string[] = [];

  lines.push(`Company: ${role.company}`);
  lines.push(`Title: ${role.title}`);
  lines.push('');
  lines.push(role.jd || '');

  return lines.join('\n');
}
