#!/usr/bin/env node
'use strict';

// Hook 5: Auto-format Doc Detective test spec JSON after editing.
// Runs as PostToolUse (Claude) / AfterTool (Gemini).
// Normalizes test spec JSON to 2-space indentation. Silent operation.

const fs = require('fs');
const path = require('path');

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
  if (!filePath || !filePath.endsWith('.json')) process.exit(0);

  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); }
  catch { process.exit(0); }

  let parsed;
  try { parsed = JSON.parse(content); }
  catch { process.exit(0); }

  if (!parsed || !Array.isArray(parsed.tests)) process.exit(0);

  const formatted = JSON.stringify(parsed, null, 2) + '\n';
  if (formatted === content) process.exit(0);

  try { fs.writeFileSync(filePath, formatted); }
  catch { /* ignore write errors */ }

  process.exit(0);
}

main();
