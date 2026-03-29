'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook, parseOutput } = require('./helpers');

describe('Hook 6: post-edit-warn-inline-tests', function () {
  this.timeout(10000);

  let tmpDir;

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook6-'));
  });

  afterEach(function () {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should warn for Markdown files with HTML test comments', async function () {
    const filePath = path.join(tmpDir, 'guide.md');
    fs.writeFileSync(filePath, [
      '# Getting Started',
      '<!-- test {"testId":"start"} -->',
      'Go to the homepage.',
      '<!-- step {"goTo":"https://example.com"} -->',
      '<!-- test end -->',
    ].join('\n'));

    const result = await runHook('post-edit-warn-inline-tests.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);

    const output = parseOutput(result.stdout);
    assert.ok(output, 'should produce JSON output');
    assert.ok(output.additionalContext.includes('guide.md'));
    assert.ok(output.additionalContext.includes('HTML/Markdown'));
  });

  it('should warn for MDX files with JSX test comments', async function () {
    const filePath = path.join(tmpDir, 'page.mdx');
    fs.writeFileSync(filePath, [
      '# Page',
      '{/* test {"testId":"mdx-test"} */}',
      'Click the button.',
      '{/* step {"click":"Submit"} */}',
    ].join('\n'));

    const result = await runHook('post-edit-warn-inline-tests.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);

    const output = parseOutput(result.stdout);
    assert.ok(output?.additionalContext.includes('MDX/JSX'));
  });

  it('should warn for XML/DITA files with processing instructions', async function () {
    const filePath = path.join(tmpDir, 'topic.dita');
    fs.writeFileSync(filePath, [
      '<topic>',
      '<?doc-detective step {"goTo":"https://example.com"} ?>',
      '</topic>',
    ].join('\n'));

    const result = await runHook('post-edit-warn-inline-tests.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);

    const output = parseOutput(result.stdout);
    assert.ok(output?.additionalContext.includes('XML/DITA'));
  });

  it('should warn for AsciiDoc files with comment-based tests', async function () {
    const filePath = path.join(tmpDir, 'guide.adoc');
    fs.writeFileSync(filePath, [
      '= Guide',
      '// (step {"goTo":"https://example.com"})',
      'Navigate to the site.',
    ].join('\n'));

    const result = await runHook('post-edit-warn-inline-tests.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);

    const output = parseOutput(result.stdout);
    assert.ok(output?.additionalContext.includes('AsciiDoc'));
  });

  it('should exit silently for doc files without inline tests', async function () {
    const filePath = path.join(tmpDir, 'plain.md');
    fs.writeFileSync(filePath, '# Just a heading\n\nSome content.\n');

    const result = await runHook('post-edit-warn-inline-tests.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout.trim(), '');
  });

  it('should exit silently for non-doc file extensions', async function () {
    const filePath = path.join(tmpDir, 'app.js');
    fs.writeFileSync(filePath, '// (step {"goTo":"url"})');

    const result = await runHook('post-edit-warn-inline-tests.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout.trim(), '');
  });

  it('should exit silently for non-existent files', async function () {
    const result = await runHook('post-edit-warn-inline-tests.js', {
      tool_input: { file_path: path.join(tmpDir, 'missing.md') },
    });
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout.trim(), '');
  });

  it('should report multiple formats when mixed patterns exist', async function () {
    const filePath = path.join(tmpDir, 'mixed.html');
    fs.writeFileSync(filePath, [
      '<!-- test {"testId":"mixed"} -->',
      '<?doc-detective step {"goTo":"https://example.com"} ?>',
    ].join('\n'));

    const result = await runHook('post-edit-warn-inline-tests.js', {
      tool_input: { file_path: filePath },
    });
    assert.strictEqual(result.code, 0);

    const output = parseOutput(result.stdout);
    assert.ok(output?.additionalContext.includes('HTML/Markdown'));
    assert.ok(output?.additionalContext.includes('XML/DITA'));
  });

  it('should handle all supported doc extensions', async function () {
    const extensions = ['.md', '.markdown', '.mdx', '.html', '.htm', '.xml', '.dita', '.ditamap', '.adoc', '.asciidoc', '.asc'];
    for (const ext of extensions) {
      const filePath = path.join(tmpDir, `file${ext}`);
      fs.writeFileSync(filePath, '<!-- step {"goTo":"url"} -->');

      const result = await runHook('post-edit-warn-inline-tests.js', {
        tool_input: { file_path: filePath },
      });
      assert.strictEqual(result.code, 0);
      assert.ok(parseOutput(result.stdout)?.additionalContext, `should warn for ${ext}`);
    }
  });

  it('should handle invalid stdin JSON gracefully', async function () {
    const result = await runHook('post-edit-warn-inline-tests.js', 'not json');
    assert.strictEqual(result.code, 0);
  });
});
