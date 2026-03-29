'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook, parseOutput } = require('./helpers');

describe('Hook 3: post-edit-suggest-testing', function () {
  this.timeout(10000);

  let tmpDir;

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook3-'));
  });

  afterEach(function () {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should suggest testing when doc file edited and config exists', async function () {
    // Create a Doc Detective config file
    fs.writeFileSync(path.join(tmpDir, '.doc-detective.json'), '{}');

    const result = await runHook('post-edit-suggest-testing.js', {
      tool_input: { file_path: path.join(tmpDir, 'guide.md') },
      cwd: tmpDir,
    });
    assert.strictEqual(result.code, 0);

    const output = parseOutput(result.stdout);
    assert.ok(output, 'should produce JSON output');
    assert.ok(output.additionalContext.includes('guide.md'));
    assert.ok(output.additionalContext.includes('/doc-detective-test'));
  });

  it('should work with .doc-detective.yaml config', async function () {
    fs.writeFileSync(path.join(tmpDir, '.doc-detective.yaml'), '');

    const result = await runHook('post-edit-suggest-testing.js', {
      tool_input: { file_path: path.join(tmpDir, 'docs.md') },
      cwd: tmpDir,
    });
    assert.strictEqual(result.code, 0);
    assert.ok(parseOutput(result.stdout)?.additionalContext);
  });

  it('should work with .doc-detective.yml config', async function () {
    fs.writeFileSync(path.join(tmpDir, '.doc-detective.yml'), '');

    const result = await runHook('post-edit-suggest-testing.js', {
      tool_input: { file_path: path.join(tmpDir, 'page.html') },
      cwd: tmpDir,
    });
    assert.strictEqual(result.code, 0);
    assert.ok(parseOutput(result.stdout)?.additionalContext);
  });

  it('should work with doc-detective.config.js config', async function () {
    fs.writeFileSync(path.join(tmpDir, 'doc-detective.config.js'), '');

    const result = await runHook('post-edit-suggest-testing.js', {
      tool_input: { file_path: path.join(tmpDir, 'content.mdx') },
      cwd: tmpDir,
    });
    assert.strictEqual(result.code, 0);
    assert.ok(parseOutput(result.stdout)?.additionalContext);
  });

  it('should exit silently when no config file exists', async function () {
    const result = await runHook('post-edit-suggest-testing.js', {
      tool_input: { file_path: path.join(tmpDir, 'guide.md') },
      cwd: tmpDir,
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout.trim(), '');
  });

  it('should exit silently for non-doc file extensions', async function () {
    fs.writeFileSync(path.join(tmpDir, '.doc-detective.json'), '{}');

    const result = await runHook('post-edit-suggest-testing.js', {
      tool_input: { file_path: path.join(tmpDir, 'app.js') },
      cwd: tmpDir,
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout.trim(), '');
  });

  it('should exit silently for JSON files', async function () {
    fs.writeFileSync(path.join(tmpDir, '.doc-detective.json'), '{}');

    const result = await runHook('post-edit-suggest-testing.js', {
      tool_input: { file_path: path.join(tmpDir, 'spec.json') },
      cwd: tmpDir,
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout.trim(), '');
  });

  it('should exit silently when no file_path provided', async function () {
    const result = await runHook('post-edit-suggest-testing.js', {
      tool_input: {},
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout.trim(), '');
  });

  it('should use CLAUDE_PROJECT_DIR env var for config lookup', async function () {
    fs.writeFileSync(path.join(tmpDir, '.doc-detective.json'), '{}');

    const result = await runHook('post-edit-suggest-testing.js', {
      tool_input: { file_path: '/some/other/path/readme.md' },
    }, { env: { CLAUDE_PROJECT_DIR: tmpDir } });
    assert.strictEqual(result.code, 0);
    assert.ok(parseOutput(result.stdout)?.additionalContext);
  });

  it('should handle all doc extensions', async function () {
    fs.writeFileSync(path.join(tmpDir, '.doc-detective.json'), '{}');

    const extensions = ['.md', '.markdown', '.mdx', '.html', '.htm', '.xml', '.dita', '.ditamap', '.adoc', '.asciidoc', '.asc'];
    for (const ext of extensions) {
      const result = await runHook('post-edit-suggest-testing.js', {
        tool_input: { file_path: path.join(tmpDir, `file${ext}`) },
        cwd: tmpDir,
      });
      assert.strictEqual(result.code, 0);
      assert.ok(parseOutput(result.stdout)?.additionalContext, `should suggest for ${ext}`);
    }
  });
});
