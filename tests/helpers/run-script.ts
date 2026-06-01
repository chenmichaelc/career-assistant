// tests/helpers/run-script.ts
// Career Assistant — Script runner for E2E tests

import { spawnSync, SpawnSyncReturns } from 'child_process';
import path                             from 'path';
import fs                               from 'fs';

const LOG_PATH = path.join(__dirname, '../../logs/e2e-test-runs.log');

interface ScriptResult {
  stdout:   string;
  stderr:   string;
  exitCode: number;
}

interface LogEntry {
  timestamp: string;
  script:    string;
  exitCode:  number;
  ids:       number[];
}

function extractIds(stdout: string): number[] {
  const ids: number[] = [];

  const singleId = stdout.trim().match(/^\d+$/);
  if (singleId) {
    ids.push(parseInt(singleId[0], 10));
    return ids;
  }

  const matches = stdout.matchAll(/^Inserted:\s+(\d+)/gm);
  for (const match of matches) {
    ids.push(parseInt(match[1], 10));
  }

  return ids;
}

function writeLog(entry: LogEntry): void {
  const logDir = path.dirname(LOG_PATH);

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
}

export function runScript(scriptName: string, stdin: string = '', args: string[] = []): ScriptResult {
  const scriptPath = path.join(__dirname, '../../scripts', scriptName.replace('.js', '.ts'));

  const result: SpawnSyncReturns<string> = spawnSync(
    'ts-node',
    [scriptPath, ...args],
    {
      input:    stdin,
      encoding: 'utf8',
    }
  );

  const stdout   = result.stdout   ?? '';
  const stderr   = result.stderr   ?? '';
  const exitCode = result.status   ?? 1;
  const ids      = extractIds(stdout);

  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    script:    scriptName,
    exitCode,
    ids,
  };

  writeLog(logEntry);

  return { stdout, stderr, exitCode };
}
