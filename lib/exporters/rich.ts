// lib/exporters/rich.ts
// Career Assistant — Rich export format
// Outputs in the same format as the importer expects.
// Can be re-imported via import-roles.ts.

import { RoleRow } from '../types';

export function richExport(role: RoleRow): string {
  const lines: string[] = [];

  lines.push(`URL: ${role.url ?? ''}`);
  lines.push(`Company: ${role.company}`);
  lines.push(`Title: ${role.title}`);
  lines.push(`Salary Min: ${role.salary_min ?? ''}`);
  lines.push(`Salary Max: ${role.salary_max ?? ''}`);
  lines.push('Description:');
  lines.push(role.jd || '');
  lines.push('');
  lines.push('--');

  return lines.join('\n');
}
