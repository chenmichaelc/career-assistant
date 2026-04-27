// lib/args/list-args.js
// Career Assistant — Argument parser for list-roles.js
// Pure function: takes process.argv slice, returns flags object.

function parseArgs(argv) {
  const flags = {};

  for (let i = 0; i < argv.length; i += 2) {
    const flag  = argv[i].replace('--', '');
    const value = argv[i + 1];
    flags[flag] = value;
  }

  return flags;
}

module.exports = { parseArgs };
