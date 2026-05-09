// lib/args/list-args.ts
// Career Assistant — Argument parser for list-roles.ts
// Pure function: takes process.argv slice, returns flags object.

export interface ListArgs {
  status?:  string;
  company?: string;
}

export function parseArgs(argv: string[]): ListArgs {
  const flags: ListArgs = {};

  for (let i = 0; i < argv.length; i += 2) {
    const flag  = argv[i].replace('--', '') as keyof ListArgs;
    const value = argv[i + 1];
    flags[flag] = value;
  }

  return flags;
}
