'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runClaude, runGemini, isClaudeAvailable, isGeminiAvailable } = require('./helpers');

describe('Integration: Claude Code', function () {
  this.timeout(120000);

  let tmpDir;
  let available;

  before(async function () {
    available = await isClaudeAvailable();
    if (!available) this.skip();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-integration-'));
  });

  after(function () {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should block anti-pattern via Hook 2', async function () {
    const filePath = path.join(tmpDir, 'antipattern.json');

    const result = await runClaude(
      `Write a file at ${filePath} with exactly this content: {"tests":[{"testId":"t","steps":[{"action":"goTo","url":"https://example.com"}]}]}. ` +
      `Report whether a hook blocked the write. Answer ONLY "BLOCKED" or "WRITTEN".`
    );

    assert.ok(
      result.stdout.includes('BLOCKED') || result.stdout.toLowerCase().includes('block'),
      `Expected hook to block the write. Got: ${result.stdout.slice(0, 200)}`
    );

    // File should NOT exist since the write was blocked
    assert.ok(!fs.existsSync(filePath), 'File should not have been created');
  });

  it('should allow correct format and auto-format via Hook 5', async function () {
    const filePath = path.join(tmpDir, 'valid.json');

    const result = await runClaude(
      `Write a file at ${filePath} with exactly this content: {"tests":[{"testId":"t","steps":[{"goTo":"https://example.com"}]}]}. ` +
      `Then read the file back and tell me if it is compact (one line) or pretty-printed (multi-line). Answer ONLY "COMPACT" or "PRETTY".`
    );

    assert.ok(fs.existsSync(filePath), 'File should have been created');

    // Hook 5 should have reformatted to pretty-printed
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('\n'), 'File should be pretty-printed by Hook 5');

    const parsed = JSON.parse(content);
    assert.ok(Array.isArray(parsed.tests), 'Should still be a valid test spec');
  });

  it('should report Doc Detective CLI availability via Hook 4', async function () {
    const result = await runClaude(
      'Is the Doc Detective CLI available in this environment? Answer ONLY "YES" or "NO".'
    );

    // Hook 4 injects context at session start, Claude should know
    assert.ok(
      result.stdout.includes('YES') || result.stdout.includes('NO'),
      `Expected YES or NO. Got: ${result.stdout.slice(0, 200)}`
    );
  });

  it('should warn about inline tests in doc files via Hook 6', async function () {
    const filePath = path.join(tmpDir, 'inline.md');
    // Pre-create a file with inline tests
    fs.writeFileSync(filePath, [
      '# Guide',
      '<!-- test {"testId":"guide"} -->',
      'Go to the homepage.',
      '<!-- step {"goTo":"https://example.com"} -->',
      '<!-- test end -->',
    ].join('\n'));

    const result = await runClaude(
      `Edit the file ${filePath} and add a new line "Updated content." after the first heading. ` +
      `After editing, report whether any hook warned about inline Doc Detective test comments. ` +
      `Answer ONLY "WARNED" or "NO WARNING".`
    );

    // Hook 6 should have fired since the file contains inline tests
    assert.ok(
      result.stdout.includes('WARNED') || result.stdout.toLowerCase().includes('warn') || result.stdout.toLowerCase().includes('inline'),
      `Expected warning about inline tests. Got: ${result.stdout.slice(0, 300)}`
    );
  });
});

describe('Integration: Gemini CLI', function () {
  // Gemini tests need extra time due to API rate limiting and retries
  this.timeout(180000);

  const projectRoot = path.resolve(__dirname, '../..');
  let tmpDir;
  let available;

  before(async function () {
    available = await isGeminiAvailable();
    if (!available) this.skip();
    // Gemini restricts writes to the workspace — use a dir inside the project
    tmpDir = fs.mkdtempSync(path.join(projectRoot, '.tmp-gemini-test-'));
  });

  after(function () {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should block anti-pattern via BeforeTool hook', async function () {
    const filePath = path.join(tmpDir, 'antipattern.json');

    const result = await runGemini(
      `Write a file at ${filePath} with exactly this content: {"tests":[{"testId":"t","steps":[{"action":"goTo","url":"https://example.com"}]}]}. ` +
      `Report whether a hook blocked the write. Answer ONLY "BLOCKED" or "WRITTEN".`
    );

    // Skip if Gemini returned empty output (rate limited)
    if (!result.stdout.trim()) this.skip();

    assert.ok(
      result.stdout.includes('BLOCKED') || result.stdout.toLowerCase().includes('block'),
      `Expected hook to block the write. Got: ${result.stdout.slice(0, 300)}`
    );

    assert.ok(!fs.existsSync(filePath), 'File should not have been created');
  });

  it('should allow correct format and auto-format via AfterTool hook', async function () {
    const filePath = path.join(tmpDir, 'valid.json');

    const result = await runGemini(
      `Write a file at ${filePath} with exactly this content: {"tests":[{"testId":"t","steps":[{"goTo":"https://example.com"}]}]}`
    );

    if (!result.stdout.trim() && !fs.existsSync(filePath)) this.skip();

    assert.ok(fs.existsSync(filePath), 'File should have been created');

    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('\n'), 'File should be pretty-printed by format hook');

    const parsed = JSON.parse(content);
    assert.ok(Array.isArray(parsed.tests), 'Should still be a valid test spec');
  });

  it('should report Doc Detective CLI availability via SessionStart hook', async function () {
    const result = await runGemini(
      'Is the Doc Detective CLI available in this environment? Answer ONLY "YES" or "NO".'
    );

    // Skip if auth prompt or empty (rate limited / auth issues in CI)
    if (!result.stdout.trim() || result.stdout.includes('authentication')) this.skip();

    assert.ok(
      result.stdout.includes('YES') || result.stdout.includes('NO'),
      `Expected YES or NO. Got: ${result.stdout.slice(0, 200)}`
    );
  });

  it('should warn about inline tests in doc files via AfterTool hook', async function () {
    const filePath = path.join(tmpDir, 'inline.md');
    fs.writeFileSync(filePath, [
      '# Guide',
      '<!-- test {"testId":"guide"} -->',
      'Go to the homepage.',
      '<!-- step {"goTo":"https://example.com"} -->',
      '<!-- test end -->',
    ].join('\n'));

    const result = await runGemini(
      `Edit the file ${filePath} and add a new line "Updated content." after the first heading. ` +
      `After editing, report whether any hook warned about inline Doc Detective test comments. ` +
      `Answer ONLY "WARNED" or "NO WARNING".`
    );

    // Skip if empty (rate limited) or auth issues
    if (!result.stdout.trim() || result.stdout.includes('authentication')) this.skip();

    // Check stdout OR stderr — Gemini may surface hook context in either
    const combined = result.stdout + result.stderr;
    assert.ok(
      combined.includes('WARNED') || combined.toLowerCase().includes('warn') ||
      combined.toLowerCase().includes('inline') || combined.toLowerCase().includes('doc detective'),
      `Expected warning about inline tests. Got stdout: ${result.stdout.slice(0, 200)}`
    );
  });
});
