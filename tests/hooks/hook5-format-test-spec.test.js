'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook } = require('./helpers');

describe('Hook 5: post-edit-format-test-spec', function () {
  this.timeout(10000);

  let tmpDir;

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook5-'));
  });

  afterEach(function () {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should format compact JSON to 2-space indentation', async function () {
    const spec = { tests: [{ testId: 'test1', steps: [{ goTo: 'https://example.com' }] }] };
    const filePath = path.join(tmpDir, 'spec.json');
    fs.writeFileSync(filePath, JSON.stringify(spec));

    const result = await runHook('post-edit-format-test-spec.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout.trim(), '', 'should produce no output');

    const content = fs.readFileSync(filePath, 'utf8');
    const expected = JSON.stringify(spec, null, 2) + '\n';
    assert.strictEqual(content, expected);
  });

  it('should not modify already-formatted files', async function () {
    const spec = { tests: [{ testId: 'test1', steps: [{ find: 'Hello' }] }] };
    const formatted = JSON.stringify(spec, null, 2) + '\n';
    const filePath = path.join(tmpDir, 'spec.json');
    fs.writeFileSync(filePath, formatted);

    const mtime = fs.statSync(filePath).mtimeMs;

    const result = await runHook('post-edit-format-test-spec.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);

    const content = fs.readFileSync(filePath, 'utf8');
    assert.strictEqual(content, formatted);
  });

  it('should exit silently for non-JSON files', async function () {
    const result = await runHook('post-edit-format-test-spec.js', {
      tool_input: { file_path: '/tmp/readme.md' },
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout.trim(), '');
  });

  it('should exit silently for JSON without tests array', async function () {
    const filePath = path.join(tmpDir, 'config.json');
    const content = JSON.stringify({ name: 'test' });
    fs.writeFileSync(filePath, content);

    const result = await runHook('post-edit-format-test-spec.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);

    // File should not be modified
    assert.strictEqual(fs.readFileSync(filePath, 'utf8'), content);
  });

  it('should exit silently for non-existent files', async function () {
    const result = await runHook('post-edit-format-test-spec.js', {
      tool_input: { file_path: path.join(tmpDir, 'missing.json') },
    });
    assert.strictEqual(result.code, 0);
  });

  it('should exit silently for invalid JSON content', async function () {
    const filePath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(filePath, '{ not valid');

    const result = await runHook('post-edit-format-test-spec.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);

    // File should not be modified
    assert.strictEqual(fs.readFileSync(filePath, 'utf8'), '{ not valid');
  });

  it('should handle multi-test specs', async function () {
    const spec = {
      tests: [
        { testId: 'a', steps: [{ goTo: 'https://a.com' }] },
        { testId: 'b', steps: [{ click: 'Submit' }, { find: 'Success' }] },
      ],
    };
    const filePath = path.join(tmpDir, 'multi.json');
    fs.writeFileSync(filePath, JSON.stringify(spec));

    await runHook('post-edit-format-test-spec.js', {
      tool_input: { file_path: filePath },
    });

    const content = fs.readFileSync(filePath, 'utf8');
    assert.strictEqual(content, JSON.stringify(spec, null, 2) + '\n');
  });

  it('should handle invalid stdin JSON gracefully', async function () {
    const result = await runHook('post-edit-format-test-spec.js', 'not json');
    assert.strictEqual(result.code, 0);
  });
});
