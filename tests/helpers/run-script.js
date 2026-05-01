// tests/helpers/run-script.js
// Career Assistant — Script runner for E2E tests
// Spawns a script as a child process with fixed stdin and captures output.
// Logs all test runs to logs/e2e-test-runs.log with inserted IDs.

const { spawnSync } = require('child_process');
const path          = require('path');
const fs            = require('fs');

const LOG_PATH = path.join(__dirname, '../../logs/e2e-test-runs.log');

function extractIds(stdout) {
  const ids = [];

  // Matches: "142\n" from add-role.js
  const singleId = stdout.trim().match(/^\d+$/);
  if (singleId) {
    ids.push(parseInt(singleId[0], 10));
    return ids;
  }

  // Matches: "Inserted: 143 — ..." lines from import-roles.js
  const matches = stdout.matchAll(/^Inserted:\s+(\d+)/gm);
  for (const match of matches) {
    ids.push(parseInt(match[1], 10));
  }

  return ids;
}

function writeLog(entry) {
  const logDir = path.dirname(LOG_PATH);

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
}

function runScript(scriptName, stdin = '', args = []) {
  const scriptPath = path.join(__dirname, '../../scripts', scriptName);

  const result = spawnSync('node', [scriptPath, ...args], {
    input:    stdin,
    encoding: 'utf8',
  });

  const stdout   = result.stdout;
  const stderr   = result.stderr;
  const exitCode = result.status;
  const ids      = extractIds(stdout);

  const logEntry = {
    timestamp: new Date().toISOString(),
    script:    scriptName,
    exitCode:  exitCode,
    ids:       ids,
  };

  writeLog(logEntry);

  return {
    stdout,
    stderr,
    exitCode,
  };
}

module.exports = { runScript };
