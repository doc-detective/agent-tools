#!/usr/bin/env node
'use strict';

// Hook 3: Suggest running Doc Detective tests after documentation edits.
// Runs as PostToolUse (Claude) / AfterTool (Gemini).
// Only fires if the project has a Doc Detective config file.

const fs = require('fs');
const path = require('path');

const DOC_EXTENSIONS = new Set([
  '.md', '.markdown', '.mdx', '.html', '.htm',
  '.xml', '.dita', '.ditamap', '.adoc', '.asciidoc', '.asc'
]);

const CONFIG_FILES = [
  '.doc-detective.json',
  '.doc-detective.yaml',
  '.doc-detective.yml',
  'doc-detective.config.js'
];

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => chunks.push(chunk));
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(chunks.join(''))); }
      catch (e) { reject(e); }
    });
    process.stdin.on('error', reject);
  });
}

async function main() {
  let input;
  try { input = await readStdin(); }
  catch { process.exit(0); }

  const filePath = input?.tool_input?.file_path || input?.tool_input?.filePath;
  if (!filePath) process.exit(0);

  const ext = path.extname(filePath).toLowerCase();
  if (!DOC_EXTENSIONS.has(ext)) process.exit(0);

  // Check if project uses Doc Detective
  const projectRoot = process.env.CLAUDE_PROJECT_DIR
    || process.env.GEMINI_PROJECT_DIR
    || input?.cwd;

  if (!projectRoot) process.exit(0);

  const hasConfig = CONFIG_FILES.some(f => {
    try { return fs.existsSync(path.join(projectRoot, f)); }
    catch { return false; }
  });

  if (!hasConfig) process.exit(0);

  const fileName = path.basename(filePath);
  console.log(JSON.stringify({
    additionalContext:
      `Documentation file "${fileName}" was modified. ` +
      `Consider running /doc-detective-test to verify that any Doc Detective ` +
      `tests covering this file still pass.`
  }));

  process.exit(0);
}

main();
