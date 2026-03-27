'use strict';

const assert = require('assert');
const { runHook, parseOutput } = require('./helpers');

describe('Hook 2: pre-edit-block-action-antipattern', function () {
  this.timeout(10000);

  // --- Blocking cases (exit 2) ---

  it('should block {"action": "goTo"} in JSON files with exit 2', async function () {
    const result = await runHook('pre-edit-block-action-antipattern.js', {
      tool_input: {
        file_path: '/tmp/spec.json',
        content: '{"action": "goTo", "url": "https://example.com"}',
      },
    });
    assert.strictEqual(result.code, 2);
    assert.ok(result.stderr.includes('Doc Detective format error'));
    assert.ok(result.stderr.includes('goTo'));
  });

  it('should block {"action": "click"} in JSON files', async function () {
    const result = await runHook('pre-edit-block-action-antipattern.js', {
      tool_input: {
        file_path: '/tmp/spec.json',
        content: '{"action": "click", "selector": "#btn"}',
      },
    });
    assert.strictEqual(result.code, 2);
    assert.ok(result.stderr.includes('click'));
  });

  it('should block {"action": "find"} in Markdown files', async function () {
    const result = await runHook('pre-edit-block-action-antipattern.js', {
      tool_input: {
        file_path: '/tmp/docs.md',
        content: '<!-- step {"action": "find", "text": "Hello"} -->',
      },
    });
    assert.strictEqual(result.code, 2);
    assert.ok(result.stderr.includes('find'));
  });

  it('should block anti-pattern in Edit new_string field', async function () {
    const result = await runHook('pre-edit-block-action-antipattern.js', {
      tool_input: {
        file_path: '/tmp/spec.json',
        new_string: '{"action": "type", "keys": "hello"}',
      },
    });
    assert.strictEqual(result.code, 2);
    assert.ok(result.stderr.includes('type'));
  });

  it('should block anti-pattern with extra whitespace', async function () {
    const result = await runHook('pre-edit-block-action-antipattern.js', {
      tool_input: {
        file_path: '/tmp/spec.json',
        content: '{"action"  :  "httpRequest"}',
      },
    });
    assert.strictEqual(result.code, 2);
    assert.ok(result.stderr.includes('httpRequest'));
  });

  it('should detect all known action names', async function () {
    const actions = [
      'checkLink', 'click', 'dragAndDrop', 'find', 'goTo', 'httpRequest',
      'loadCookie', 'loadVariables', 'record', 'runCode', 'runShell',
      'saveCookie', 'screenshot', 'stopRecord', 'type', 'wait',
    ];
    for (const action of actions) {
      const result = await runHook('pre-edit-block-action-antipattern.js', {
        tool_input: {
          file_path: '/tmp/spec.json',
          content: `{"action": "${action}"}`,
        },
      });
      assert.strictEqual(result.code, 2, `should block action: ${action}`);
    }
  });

  // --- Passing cases (exit 0) ---

  it('should allow correct format {"goTo": "url"}', async function () {
    const result = await runHook('pre-edit-block-action-antipattern.js', {
      tool_input: {
        file_path: '/tmp/spec.json',
        content: '{"goTo": "https://example.com"}',
      },
    });
    assert.strictEqual(result.code, 0);
  });

  it('should ignore non-doc, non-JSON file extensions', async function () {
    const result = await runHook('pre-edit-block-action-antipattern.js', {
      tool_input: {
        file_path: '/tmp/app.py',
        content: '{"action": "goTo"}',
      },
    });
    assert.strictEqual(result.code, 0);
  });

  it('should exit 0 when content is empty', async function () {
    const result = await runHook('pre-edit-block-action-antipattern.js', {
      tool_input: {
        file_path: '/tmp/spec.json',
        content: '',
      },
    });
    assert.strictEqual(result.code, 0);
  });

  it('should exit 0 when no file_path is provided', async function () {
    const result = await runHook('pre-edit-block-action-antipattern.js', {
      tool_input: { content: '{"action": "goTo"}' },
    });
    assert.strictEqual(result.code, 0);
  });

  it('should exit 0 for invalid stdin JSON', async function () {
    const result = await runHook('pre-edit-block-action-antipattern.js', 'not json');
    assert.strictEqual(result.code, 0);
  });

  it('should not block "action" with unknown action names', async function () {
    const result = await runHook('pre-edit-block-action-antipattern.js', {
      tool_input: {
        file_path: '/tmp/spec.json',
        content: '{"action": "unknownAction"}',
      },
    });
    assert.strictEqual(result.code, 0);
  });

  it('should handle doc extensions: .mdx, .html, .adoc, .dita', async function () {
    for (const ext of ['.mdx', '.html', '.adoc', '.dita']) {
      const result = await runHook('pre-edit-block-action-antipattern.js', {
        tool_input: {
          file_path: `/tmp/file${ext}`,
          content: '{"action": "goTo"}',
        },
      });
      assert.strictEqual(result.code, 2, `should block in ${ext} files`);
    }
  });
});
