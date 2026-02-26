'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Read agent config files from the given base directory.
 * Scans <baseDir>/agents/ for subdirectories, reads each config.json.
 *
 * @param {string} baseDir - Root directory containing an `agents/` subdirectory
 * @returns {Array<{name: string, emoji: string, model: string, skillsCount: number, pathsCount: number, raw: object}>}
 */
function readConfigs(baseDir) {
  const agentsDir = path.join(baseDir, 'agents');

  // Missing agents/ dir → return []
  if (!fs.existsSync(agentsDir)) {
    return [];
  }

  let entries;
  try {
    entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  } catch (err) {
    process.stderr.write(`[readConfigs] Failed to read agents dir: ${agentsDir}: ${err.message}\n`);
    return [];
  }

  const subdirs = entries.filter(e => e.isDirectory());

  // Empty agents/ dir → return []
  if (subdirs.length === 0) {
    return [];
  }

  const results = [];

  for (const dirent of subdirs) {
    const configPath = path.join(agentsDir, dirent.name, 'config.json');

    // Missing config.json → skip with warning
    if (!fs.existsSync(configPath)) {
      process.stderr.write(`[readConfigs] Warning: no config.json found for agent "${dirent.name}" (expected at ${configPath})\n`);
      continue;
    }

    let raw;
    try {
      const contents = fs.readFileSync(configPath, 'utf8');
      raw = JSON.parse(contents);
    } catch (err) {
      process.stderr.write(`[readConfigs] Warning: failed to parse config for agent "${dirent.name}" (${configPath}): ${err.message}\n`);
      continue;
    }

    const name = raw.name != null ? String(raw.name) : dirent.name;
    const emoji = raw.emoji != null ? String(raw.emoji) : '🤖';
    const model = raw.model != null ? String(raw.model) : '(unknown)';
    const skills = Array.isArray(raw.skills) ? raw.skills : [];
    const fileAccessPaths = Array.isArray(raw.fileAccessPaths) ? raw.fileAccessPaths : [];

    results.push({
      name,
      emoji,
      model,
      skillsCount: skills.length,
      pathsCount: fileAccessPaths.length,
      raw,
    });
  }

  return results;
}

module.exports = { readConfigs };
