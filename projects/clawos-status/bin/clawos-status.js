#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { readConfigs } = require('../lib/readConfigs');
const { formatTable } = require('../lib/formatTable');

// ── Arg parsing ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

const showHelp = args.includes('--help') || args.includes('-h');
const jsonMode = args.includes('--json');

// Positional arg: first arg that isn't a flag (doesn't start with --)
const positional = args.find(a => !a.startsWith('-'));
const baseDir = positional ? path.resolve(positional) : process.cwd();

// ── Help ───────────────────────────────────────────────────────────────────────
if (showHelp) {
  process.stdout.write([
    'Usage: clawos-status [baseDir] [options]',
    '',
    'Arguments:',
    '  baseDir          Path to the agents root directory (default: cwd)',
    '',
    'Options:',
    '  --json           Output agents as JSON array (pretty-printed)',
    '  --help, -h       Show this help message and exit',
    '',
    'Description:',
    '  Reads agent configs from <baseDir>/agents/*/config.json and',
    '  displays a formatted status table or JSON output.',
    '',
    'Example:',
    '  clawos-status /home/user/.openclaw/workspace',
    '  clawos-status --json',
    '  clawos-status /some/path --json',
    '',
  ].join('\n'));
  process.exit(0);
}

// ── Validate baseDir ───────────────────────────────────────────────────────────
try {
  const stat = fs.statSync(baseDir);
  if (!stat.isDirectory()) {
    process.stderr.write(`Error: baseDir is not a directory: ${baseDir}\n`);
    process.exit(1);
  }
} catch (err) {
  process.stderr.write(`Error: cannot access baseDir "${baseDir}": ${err.message}\n`);
  process.exit(1);
}

// ── Main ───────────────────────────────────────────────────────────────────────
try {
  const agents = readConfigs(baseDir);

  if (jsonMode) {
    process.stdout.write(JSON.stringify(agents, null, 2) + '\n');
  } else {
    process.stdout.write(formatTable(agents) + '\n');
  }

  process.exit(0);
} catch (err) {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
}
