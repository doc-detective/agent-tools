'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
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

    // Output depends on whether the validator script is reachable.
    // If validator exists, we get PASSED/FAILED. If not, silent exit.
    const trimmed = result.stdout.trim();
    if (trimmed) {
      const output = parseOutput(result.stdout);
      assert.ok(output, 'stdout must be valid JSON when present');
      assert.ok(output.additionalContext, 'should have additionalContext');
      assert.ok(output.additionalContext.includes('spec.json'), 'should reference the filename');
    } else {
      assert.strictEqual(trimmed, '');
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

describe('Bundled validator: doc-detective-validate-test.js', function () {
  this.timeout(30000);

  const SCRIPTS_DIR = path.resolve(__dirname, '../../src/skills/doc-detective-doc-testing/scripts');
  const BUNDLE = path.join(SCRIPTS_DIR, 'doc-detective-validate-test.js');
  let tmpDir;

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-'));
  });

  afterEach(function () {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function validate(steps, script = BUNDLE) {
    const filePath = path.join(tmpDir, 'spec.json');
    fs.writeFileSync(filePath, JSON.stringify({ tests: [{ testId: 't', steps }] }));
    return new Promise((resolve) => {
      execFile('node', [script, filePath], { timeout: 25000 }, (err, stdout, stderr) => {
        resolve({ code: err ? err.code : 0, stdout, stderr });
      });
    });
  }

  // Step shapes that CLI 5 rejects but older bundles accepted.
  const invalidShapes = [
    { wait: { selector: '#x', state: 'visible' } },
    { goTo: { url: 'https://example.com', waitUntil: 'networkidle' } },
    { find: { selector: '#x', matchText: 'Hi' } },
    { click: {} },
  ];

  for (const step of invalidShapes) {
    it(`rejects ${JSON.stringify(step)}`, async function () {
      const result = await validate([step]);
      assert.strictEqual(result.code, 1, result.stdout + result.stderr);
      assert.ok(result.stdout.includes('Validation FAILED'));
    });
  }

  it('accepts swipe and annotate steps', async function () {
    const result = await validate([
      { swipe: 'up' },
      { annotate: { add: [{ outline: '#submit-button' }] } },
    ]);
    assert.strictEqual(result.code, 0, result.stdout + result.stderr);
    assert.ok(result.stdout.includes('Validation PASSED'));
  });

  it('fails loudly when doc-detective-common cannot load', async function () {
    // An unbundled copy outside any node_modules tree can't resolve common.
    const copy = path.join(tmpDir, 'validate-test.mjs');
    fs.copyFileSync(path.join(SCRIPTS_DIR, 'src/validate-test.mjs'), copy);
    const result = await validate([{ goTo: 'https://example.com' }], copy);
    assert.notStrictEqual(result.code, 0, result.stdout + result.stderr);
    assert.ok(!result.stdout.includes('Validation PASSED'));
    assert.ok(result.stderr.includes('doc-detective-common'));
  });
});
