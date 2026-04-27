// lib/args/update-args.js
// Career Assistant — Argument parser for update-status.js
// Pure function: takes process.argv slice, returns flags object.

function parseArgs(argv) {
  const flags = { reasons: [], termination: [] };

  let i = 0;

  while (i < argv.length) {
    const flag   = argv[i].replace('--', '');
    const values = [];

    i++;

    while (i < argv.length && !argv[i].startsWith('--')) {
      values.push(argv[i]);
      i++;
    }

    if (flag === 'reasons' || flag === 'termination') {
      flags[flag] = values;
    } else {
      flags[flag] = values[0];
    }
  }

  return flags;
}

module.exports = { parseArgs };
