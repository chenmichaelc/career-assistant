// lib/exporters/index.ts
// Career Assistant — Export orchestrator
// Selects the appropriate format and returns the exported string.

import { RoleRow }       from '../types';
import { simpleExport }  from './simple';
import { richExport }    from './rich';

export type ExportFormat = 'simple' | 'rich';

export interface RoleExporter {
  export(role: RoleRow): string;
}

export function exportRole(role: RoleRow, format: ExportFormat): string {
  switch (format) {
    case 'simple': return simpleExport(role);
    case 'rich':   return richExport(role);
    default: {
      const exhaustive: never = format;
      throw new Error(`Unknown export format: ${exhaustive}`);
    }
  }
}