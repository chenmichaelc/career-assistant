// lib/args/update-args.ts
// Career Assistant — Argument parser for update-status.ts
// Pure function: takes process.argv slice, returns flags object.

export interface UpdateArgs {
  id?: string;
  status?: string;
  reasons: string[];
  termination: string[];
  note?: string;
}

export function parseArgs(argv: string[]): UpdateArgs {
  const flags: UpdateArgs = { reasons: [], termination: [] };

  let i = 0;

  while (i < argv.length) {
    const flag: string = argv[i].replace('--', '');
    const values: string[] = [];

    i++;

    while (i < argv.length && !argv[i].startsWith('--')) {
      values.push(argv[i]);
      i++;
    }

    if (flag === 'reasons') {
      flags.reasons = values;
    } else if (flag === 'termination') {
      flags.termination = values;
    } else if (flag === 'id') {
      flags.id = values[0];
    } else if (flag === 'status') {
      flags.status = values[0];
    } else if (flag === 'note') {
      flags.note = values[0];
    }
  }

  return flags;
}
