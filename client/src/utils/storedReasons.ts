// client/src/utils/storedReasons.ts

export interface ReasonEntry {
  reason: string;
  note: string | null;
}

// job_stubs stores skip/termination reasons as JSON text. An unparseable value
// is treated as "no reasons" rather than breaking the page that displays it.
export function parseStoredReasons(storedJson: string | null): ReasonEntry[] {
  if (!storedJson) return [];

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedJson);
  } catch {
    return [];
  }
  return Array.isArray(parsedValue) ? (parsedValue as ReasonEntry[]) : [];
}
