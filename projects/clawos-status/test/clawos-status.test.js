'use strict';

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { readConfigs } = require('../lib/readConfigs');
const { formatTable } = require('../lib/formatTable');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a unique temp directory for a single test. */
function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'clawos-status-test-'));
}

/** Recursively remove a directory. */
function rmDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Write a config.json for an agent under baseDir/agents/<name>/config.json. */
function writeAgentConfig(baseDir, agentDirName, config) {
  const agentDir = path.join(baseDir, 'agents', agentDirName);
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, 'config.json'), JSON.stringify(config), 'utf8');
}

/** Write raw (possibly invalid) bytes to an agent's config.json. */
function writeRawConfig(baseDir, agentDirName, rawContent) {
  const agentDir = path.join(baseDir, 'agents', agentDirName);
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, 'config.json'), rawContent, 'utf8');
}

// ---------------------------------------------------------------------------
// Test 1 — Table output with 2 valid agents
// ---------------------------------------------------------------------------
test('table output — 2 valid agents', () => {
  const tmpDir = makeTmpDir();
  try {
    writeAgentConfig(tmpDir, 'alpha', {
      name: 'Alpha Agent',
      emoji: '🤖',
      model: 'gpt-4',
      skills: ['skill-a', 'skill-b'],
      fileAccessPaths: ['/home/alpha'],
    });
    writeAgentConfig(tmpDir, 'beta', {
      name: 'Beta Agent',
      emoji: '🦾',
      model: 'claude-3',
      skills: ['skill-x'],
      fileAccessPaths: ['/home/beta', '/tmp'],
    });

    const agents = readConfigs(tmpDir);
    assert.equal(agents.length, 2, 'should have 2 agents');

    const output = formatTable(agents);

    assert.ok(output.includes('Alpha Agent'), 'output should contain "Alpha Agent"');
    assert.ok(output.includes('Beta Agent'), 'output should contain "Beta Agent"');
    assert.ok(output.includes('2 agents registered'), 'output should contain "2 agents registered"');

    const alpha = agents.find(a => a.name === 'Alpha Agent');
    const beta  = agents.find(a => a.name === 'Beta Agent');

    assert.ok(alpha, 'Alpha Agent should be in results');
    assert.equal(alpha.skillsCount, 2, 'Alpha should have 2 skills');
    assert.equal(alpha.pathsCount, 1, 'Alpha should have 1 path');

    assert.ok(beta, 'Beta Agent should be in results');
    assert.equal(beta.skillsCount, 1, 'Beta should have 1 skill');
    assert.equal(beta.pathsCount, 2, 'Beta should have 2 paths');

    // Counts should also appear in the rendered table
    assert.ok(output.includes('2'), 'output should contain skill count 2');
    assert.ok(output.includes('1'), 'output should contain skill/path count 1');
  } finally {
    rmDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// Test 2 — JSON output with 2 valid agents
// ---------------------------------------------------------------------------
test('JSON output — 2 valid agents', () => {
  const tmpDir = makeTmpDir();
  try {
    writeAgentConfig(tmpDir, 'agent-one', {
      name: 'Agent One',
      emoji: '🚀',
      model: 'gpt-4o',
      skills: ['coding', 'search'],
      fileAccessPaths: ['/workspace'],
    });
    writeAgentConfig(tmpDir, 'agent-two', {
      name: 'Agent Two',
      emoji: '🎯',
      model: 'llama-3',
      skills: ['vision'],
      fileAccessPaths: [],
    });

    const agents = readConfigs(tmpDir);
    const json = JSON.stringify(agents);

    // Must be valid JSON (no throw)
    const parsed = JSON.parse(json);

    assert.equal(Array.isArray(parsed), true, 'result should be an array');
    assert.equal(parsed.length, 2, 'array should have 2 elements');

    // Each element should have the expected shape
    for (const agent of parsed) {
      assert.ok('name'        in agent, 'agent should have name');
      assert.ok('emoji'       in agent, 'agent should have emoji');
      assert.ok('model'       in agent, 'agent should have model');
      assert.ok('skillsCount' in agent, 'agent should have skillsCount');
      assert.ok('pathsCount'  in agent, 'agent should have pathsCount');
      assert.ok('raw'         in agent, 'agent should have raw');
    }

    const one = parsed.find(a => a.name === 'Agent One');
    const two = parsed.find(a => a.name === 'Agent Two');

    assert.ok(one, 'Agent One should be present');
    assert.equal(one.skillsCount, 2);
    assert.equal(one.pathsCount, 1);

    assert.ok(two, 'Agent Two should be present');
    assert.equal(two.skillsCount, 1);
    assert.equal(two.pathsCount, 0);
  } finally {
    rmDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// Test 3 — Graceful skip of malformed JSON
// ---------------------------------------------------------------------------
test('graceful skip — malformed JSON config', () => {
  const tmpDir = makeTmpDir();
  try {
    // One valid config
    writeAgentConfig(tmpDir, 'valid-agent', {
      name: 'Valid Agent',
      emoji: '✅',
      model: 'gpt-4',
      skills: ['foo'],
      fileAccessPaths: [],
    });

    // One malformed config (not valid JSON)
    writeRawConfig(tmpDir, 'broken-agent', '{ this is not: valid JSON !!!');

    const agents = readConfigs(tmpDir);

    // Should return only the 1 valid agent — no crash
    assert.equal(agents.length, 1, 'should have exactly 1 agent (malformed skipped)');
    assert.equal(agents[0].name, 'Valid Agent');
  } finally {
    rmDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// Test 4 — Graceful skip when agents/ dir is missing
// ---------------------------------------------------------------------------
test('graceful skip — missing agents dir', () => {
  const tmpDir = makeTmpDir();
  try {
    // Do NOT create an agents/ subdirectory
    const agents = readConfigs(tmpDir);
    assert.deepEqual(agents, [], 'should return [] when agents/ does not exist');
  } finally {
    rmDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// Test 5 — Empty agents dir (no subdirectories)
// ---------------------------------------------------------------------------
test('empty agents dir returns empty array', () => {
  const tmpDir = makeTmpDir();
  try {
    // Create agents/ but add no agent subdirectories
    fs.mkdirSync(path.join(tmpDir, 'agents'), { recursive: true });

    const agents = readConfigs(tmpDir);
    assert.deepEqual(agents, [], 'should return [] when agents/ has no subdirs');
  } finally {
    rmDir(tmpDir);
  }
});

// ---------------------------------------------------------------------------
// Test 6 — Summary line accuracy
// ---------------------------------------------------------------------------
test('summary line — 3 agents with skills [2, 3, 1] shows correct totals', () => {
  const tmpDir = makeTmpDir();
  try {
    writeAgentConfig(tmpDir, 'agent-a', {
      name: 'Agent A',
      skills: ['s1', 's2'],          // 2 skills
      fileAccessPaths: [],
    });
    writeAgentConfig(tmpDir, 'agent-b', {
      name: 'Agent B',
      skills: ['s1', 's2', 's3'],    // 3 skills
      fileAccessPaths: [],
    });
    writeAgentConfig(tmpDir, 'agent-c', {
      name: 'Agent C',
      skills: ['s1'],                 // 1 skill
      fileAccessPaths: [],
    });

    const agents = readConfigs(tmpDir);
    assert.equal(agents.length, 3, 'should have 3 agents');

    const output = formatTable(agents);

    assert.ok(
      output.includes('3 agents registered, 6 total skills'),
      `summary line should read "3 agents registered, 6 total skills" — got:\n${output}`
    );
  } finally {
    rmDir(tmpDir);
  }
});
