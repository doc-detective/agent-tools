#!/usr/bin/env node
'use strict';

// Hook 6: Warn when editing documentation files that contain inline
// Doc Detective test comments. The edit may have affected test coverage
// or step placement.
// Runs as PostToolUse (Claude) / AfterTool (Gemini).

const fs = require('fs');
const path = require('path');

const DOC_EXTENSIONS = new Set([
  '.md', '.markdown', '.mdx', '.html', '.htm',
  '.xml', '.dita', '.ditamap', '.adoc', '.asciidoc', '.asc'
]);

// Inline test comment patterns by format
const INLINE_PATTERNS = [
  { pattern: /<!--\s*test\s/,       format: 'HTML/Markdown' },
  { pattern: /<!--\s*step\s/,       format: 'HTML/Markdown' },
  { pattern: /<!--\s*test\s+end/,   format: 'HTML/Markdown' },
  { pattern: /\{\/\*\s*step\s/,     format: 'MDX/JSX' },
  { pattern: /\{\/\*\s*test\s/,     format: 'MDX/JSX' },
  { pattern: /<\?doc-detective/,     format: 'XML/DITA' },
  { pattern: /\/\/\s*\(step\s/,     format: 'AsciiDoc' },
  { pattern: /\/\/\s*\(test\s/,     format: 'AsciiDoc' },
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

  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); }
  catch { process.exit(0); }

  const matchedFormats = new Set();
  for (const { pattern, format } of INLINE_PATTERNS) {
    if (pattern.test(content)) {
      matchedFormats.add(format);
    }
  }

  if (matchedFormats.size === 0) process.exit(0);

  const fileName = path.basename(filePath);
  const formats = Array.from(matchedFormats).join(', ');
  console.log(JSON.stringify({
    additionalContext:
      `"${fileName}" contains inline Doc Detective test comments (${formats}). ` +
      `The edit may have affected test coverage or step placement. Review the ` +
      `inline tests to ensure they still align with the surrounding content.`
  }));

  process.exit(0);
}

main();
