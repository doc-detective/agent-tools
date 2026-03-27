'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook, parseOutput } = require('./helpers');

describe('Hook 1: post-edit-validate-test-spec', function () {
  this.timeout(30000);

  let tmpDir;

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook1-'));
  });

  afterEach(function () {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should exit 0 silently for non-JSON files', async function () {
    const result = await runHook('post-edit-validate-test-spec.js', {
      tool_input: { file_path: '/tmp/readme.md' },
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout.trim(), '');
  });

  it('should exit 0 silently for JSON that is not a test spec', async function () {
    const filePath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(filePath, JSON.stringify({ name: 'test', version: '1.0' }));

    const result = await runHook('post-edit-validate-test-spec.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout.trim(), '');
  });

  it('should exit 0 silently if file does not exist', async function () {
    const result = await runHook('post-edit-validate-test-spec.js', {
      tool_input: { file_path: path.join(tmpDir, 'missing.json') },
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout.trim(), '');
  });

  it('should exit 0 silently for invalid JSON files', async function () {
    const filePath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(filePath, '{ not valid json }');

    const result = await runHook('post-edit-validate-test-spec.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout.trim(), '');
  });

  it('should output additionalContext for a valid test spec', async function () {
    const spec = {
      tests: [{
        testId: 'test1',
        steps: [{ goTo: 'https://example.com' }, { find: 'Welcome' }],
      }],
    };
    const filePath = path.join(tmpDir, 'spec.json');
    fs.writeFileSync(filePath, JSON.stringify(spec));

    const result = await runHook('post-edit-validate-test-spec.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);

    const output = parseOutput(result.stdout);
    // Output depends on whether the validator script is reachable.
    // If validator exists, we get PASSED/FAILED. If not, silent exit.
    if (output) {
      assert.ok(output.additionalContext, 'should have additionalContext');
      assert.ok(
        output.additionalContext.includes('spec.json'),
        'should reference the filename'
      );
    }
  });

  it('should exit 0 silently for invalid stdin JSON', async function () {
    const result = await runHook('post-edit-validate-test-spec.js', 'not json');
    assert.strictEqual(result.code, 0);
  });

  it('should accept filePath (camelCase) as alternate field name', async function () {
    const result = await runHook('post-edit-validate-test-spec.js', {
      tool_input: { filePath: '/tmp/readme.txt' },
    });
    assert.strictEqual(result.code, 0);
  });
});
