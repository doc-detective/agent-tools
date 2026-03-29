#!/usr/bin/env node
'use strict';

// Hook 2: Block the {"action": "goTo"} anti-pattern before writing.
// Runs as PreToolUse (Claude) / BeforeTool (Gemini).
// The correct Doc Detective format is {"goTo": "url"} — the action name
// IS the key. This hook blocks writes that use the wrong format.

const path = require('path');

const DOC_EXTENSIONS = new Set([
  '.md', '.markdown', '.mdx', '.html', '.htm',
  '.xml', '.dita', '.ditamap', '.adoc', '.asciidoc', '.asc'
]);

// Mirrors KNOWN_ACTIONS from validate-test.js
const KNOWN_ACTIONS = [
  'checkLink', 'click', 'dragAndDrop', 'find', 'goTo', 'httpRequest',
  'loadCookie', 'loadVariables', 'record', 'runCode', 'runShell',
  'saveCookie', 'screenshot', 'stopRecord', 'type', 'wait'
];

const ACTION_PATTERN = new RegExp(
  '"action"\\s*:\\s*"(' + KNOWN_ACTIONS.join('|') + ')"'
);

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

  // Only check files that could contain Doc Detective content
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.json' && !DOC_EXTENSIONS.has(ext)) process.exit(0);

  // Extract the content being written
  const content = input?.tool_input?.content     // Write / write_file
    || input?.tool_input?.new_string             // Edit / replace
    || '';

  if (!content) process.exit(0);

  const match = content.match(ACTION_PATTERN);
  if (match) {
    const actionName = match[1];
    process.stderr.write(
      `Doc Detective format error: Do not use {"action": "${actionName}"}.\n` +
      `The action name IS the key. Use {"${actionName}": ...} instead.\n\n` +
      `Correct:   {"${actionName}": "https://example.com"}\n` +
      `Incorrect: {"action": "${actionName}", "url": "https://example.com"}\n`
    );
    process.exit(2);
  }

  process.exit(0);
}

main();
