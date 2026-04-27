// tests/helpers/run-script.js
// Career Assistant — Script runner for E2E tests
// Spawns a script as a child process with fixed stdin and captures output.

const { spawnSync } = require('child_process');
const path          = require('path');

function runScript(scriptName, stdin = '', args = []) {
  const scriptPath = path.join(__dirname, '../../scripts', scriptName);

  const result = spawnSync('node', [scriptPath, ...args], {
    input:    stdin,
    encoding: 'utf8',
  });

  return {
    stdout:   result.stdout,
    stderr:   result.stderr,
    exitCode: result.status,
  };
}

module.exports = { runScript };
