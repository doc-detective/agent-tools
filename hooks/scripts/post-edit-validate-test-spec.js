#!/usr/bin/env node
'use strict';

// Hook 1: Auto-validate Doc Detective test specs after editing.
// Runs as PostToolUse (Claude) / AfterTool (Gemini).
// If the edited file is a .json test spec, spawns the bundled validation
// script and returns results as additionalContext.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

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

  // Read the file and check if it looks like a Doc Detective test spec
  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); }
  catch { process.exit(0); }

  let parsed;
  try { parsed = JSON.parse(content); }
  catch { process.exit(0); }

  if (!parsed || !Array.isArray(parsed.tests)) process.exit(0);

  // Find the validation script relative to this hook's location
  const pluginRoot = path.resolve(__dirname, '../..');
  const validatorPath = path.join(
    pluginRoot,
    'skills/doc-detective-doc-testing/scripts/doc-detective-validate-test.js'
  );

  if (!fs.existsSync(validatorPath)) {
    // Validator not available — skip silently
    process.exit(0);
  }

  // Spawn the validation script
  execFile('node', [validatorPath, filePath], { timeout: 25000 }, (err, stdout, stderr) => {
    const fileName = path.basename(filePath);
    const output = (stdout || '').trim();

    if (err && err.code === 1) {
      // Validation failed
      console.log(JSON.stringify({
        additionalContext: `Doc Detective test spec validation FAILED for ${fileName}:\n${output}`
      }));
    } else if (err) {
      // Timeout or unexpected error
      const reason = err.killed ? 'timed out' : err.message || 'unknown error';
      console.log(JSON.stringify({
        additionalContext: `Doc Detective test spec validation could not complete for ${fileName}: ${reason}`
      }));
    } else {
      // Validation passed
      console.log(JSON.stringify({
        additionalContext: `Doc Detective test spec validation PASSED for ${fileName}. ${output}`
      }));
    }
    // Exit 0 regardless — this hook is informational, not blocking
    process.exit(0);
  });
}

main();
