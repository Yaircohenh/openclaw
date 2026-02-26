'use strict';

/**
 * Format an array of agent objects into a display table string.
 *
 * @param {Array<{name: string, emoji: string, model: string, skillsCount: number, pathsCount: number}>} agents
 * @returns {string} Formatted table string
 */
function formatTable(agents) {
  const headers = ['Name', 'Emoji', 'Model', 'Skills', 'Paths'];

  // Compute total skills for summary
  const totalSkills = agents.reduce((sum, a) => sum + (a.skillsCount || 0), 0);
  const summary = `${agents.length} agents registered, ${totalSkills} total skills`;

  if (agents.length === 0) {
    return 'No agents registered.\n' + summary;
  }

  // Build rows as string arrays: [name, emoji, model, skillsCount, pathsCount]
  const rows = agents.map(a => [
    String(a.name     != null ? a.name      : ''),
    String(a.emoji    != null ? a.emoji     : ''),
    String(a.model    != null ? a.model     : ''),
    String(a.skillsCount != null ? a.skillsCount : 0),
    String(a.pathsCount  != null ? a.pathsCount  : 0),
  ]);

  // Compute column widths: max of header width and all data widths
  const colWidths = headers.map((h, i) => {
    let max = h.length;
    for (const row of rows) {
      if (row[i].length > max) max = row[i].length;
    }
    return max;
  });

  // Pad a cell value to the given width (left-aligned)
  const pad = (str, width) => str + ' '.repeat(width - str.length);

  // Build separator row
  const separator = colWidths.map(w => '-'.repeat(w)).join('-+-');

  // Build header row
  const headerRow = headers.map((h, i) => pad(h, colWidths[i])).join(' | ');

  // Build data rows
  const dataRows = rows.map(row =>
    row.map((cell, i) => pad(cell, colWidths[i])).join(' | ')
  );

  const lines = [
    headerRow,
    separator,
    ...dataRows,
    '',
    summary,
  ];

  return lines.join('\n');
}

module.exports = { formatTable };
