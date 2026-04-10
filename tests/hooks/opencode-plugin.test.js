'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '../..');
const PLUGIN_PATH = path.join(ROOT, 'plugins/doc-detective/opencode-plugin.mjs');
const SRC_PLUGIN_PATH = path.join(ROOT, 'src/hooks/opencode-plugin.mjs');

/**
 * Dynamically import the OpenCode plugin ESM module from a given path.
 * Since Mocha runs in CJS, we use dynamic import().
 */
async function loadPlugin(pluginPath) {
  const mod = await import(pathToFileURL(pluginPath).href);
  return mod.default;
}

/**
 * Create a mock OpenCode plugin context.
 */
function mockContext(overrides = {}) {
  return {
    project: { name: 'test-project' },
    directory: process.cwd(),
    worktree: process.cwd(),
    client: {},
    $: () => {},
    ...overrides,
  };
}

describe('OpenCode Plugin: build output', function () {
  this.timeout(30000);

  it('should produce opencode-plugin.mjs in plugins/doc-detective/', function () {
    assert.ok(
      fs.existsSync(PLUGIN_PATH),
      'plugins/doc-detective/opencode-plugin.mjs should exist after build'
    );
  });

  it('should NOT place opencode-plugin.mjs in root hooks/', function () {
    const rootHooksPlugin = path.join(ROOT, 'hooks/opencode-plugin.mjs');
    assert.ok(
      !fs.existsSync(rootHooksPlugin),
      'hooks/opencode-plugin.mjs should not exist (only platform-specific hook configs belong in hooks/)'
    );
  });

  it('should have hook scripts alongside the plugin', function () {
    const scriptsDir = path.join(ROOT, 'plugins/doc-detective/hooks/scripts');
    assert.ok(fs.existsSync(scriptsDir), 'hooks/scripts/ should exist in plugin dir');

    const expectedScripts = [
      'pre-edit-block-action-antipattern.js',
      'post-edit-validate-test-spec.js',
      'post-edit-suggest-testing.js',
      'post-edit-format-test-spec.js',
      'post-edit-warn-inline-tests.js',
      'session-start-check-install.sh',
    ];
    for (const script of expectedScripts) {
      assert.ok(
        fs.existsSync(path.join(scriptsDir, script)),
        `${script} should exist in hooks/scripts/`
      );
    }
  });
});

describe('OpenCode Plugin: source module', function () {
  this.timeout(30000);

  it('should export a default async function', async function () {
    const plugin = await loadPlugin(SRC_PLUGIN_PATH);
    assert.strictEqual(typeof plugin, 'function');
  });

  it('should return an object with tool.execute.before and tool.execute.after hooks', async function () {
    const plugin = await loadPlugin(SRC_PLUGIN_PATH);
    const hooks = await plugin(mockContext());
    assert.ok(hooks, 'plugin should return a hooks object');
    assert.strictEqual(typeof hooks['tool.execute.before'], 'function');
    assert.strictEqual(typeof hooks['tool.execute.after'], 'function');
  });
});

describe('OpenCode Plugin: built module', function () {
  this.timeout(30000);

  it('should export a default async function', async function () {
    const plugin = await loadPlugin(PLUGIN_PATH);
    assert.strictEqual(typeof plugin, 'function');
  });

  it('should return an object with tool.execute.before and tool.execute.after hooks', async function () {
    const plugin = await loadPlugin(PLUGIN_PATH);
    const hooks = await plugin(mockContext());
    assert.ok(hooks, 'plugin should return a hooks object');
    assert.strictEqual(typeof hooks['tool.execute.before'], 'function');
    assert.strictEqual(typeof hooks['tool.execute.after'], 'function');
  });
});

describe('OpenCode Plugin: tool.execute.before hook', function () {
  this.timeout(30000);

  let plugin, hooks;

  before(async function () {
    plugin = await loadPlugin(PLUGIN_PATH);
    hooks = await plugin(mockContext());
  });

  it('should silently skip non-edit tools', async function () {
    // Should not throw for non-edit tools
    await hooks['tool.execute.before'](
      { tool: 'read' },
      { args: { filePath: '/tmp/test.json' } }
    );
  });

  it('should throw on {"action": "goTo"} anti-pattern for edit tool', async function () {
    await assert.rejects(
      () => hooks['tool.execute.before'](
        { tool: 'write' },
        { args: { filePath: '/tmp/spec.json', content: '{"action": "goTo", "url": "https://example.com"}' } }
      ),
      (err) => {
        assert.ok(err.message.includes('Doc Detective format error'), `Expected format error, got: ${err.message}`);
        return true;
      }
    );
  });

  it('should throw on {"action": "click"} anti-pattern for edit tool', async function () {
    await assert.rejects(
      () => hooks['tool.execute.before'](
        { tool: 'edit' },
        { args: { filePath: '/tmp/spec.json', new_string: '{"action": "click", "selector": "#btn"}' } }
      ),
      (err) => {
        assert.ok(err.message.includes('Doc Detective format error'));
        return true;
      }
    );
  });

  it('should allow correct format {"goTo": "url"}', async function () {
    // Should not throw
    await hooks['tool.execute.before'](
      { tool: 'write' },
      { args: { filePath: '/tmp/spec.json', content: '{"goTo": "https://example.com"}' } }
    );
  });

  it('should skip non-JSON non-doc files', async function () {
    // Should not throw for .py files even with anti-pattern content
    await hooks['tool.execute.before'](
      { tool: 'write' },
      { args: { filePath: '/tmp/script.py', content: '{"action": "goTo"}' } }
    );
  });

  it('should handle patch tool', async function () {
    await hooks['tool.execute.before'](
      { tool: 'patch' },
      { args: { filePath: '/tmp/readme.md', content: 'Just some text' } }
    );
  });
});

describe('OpenCode Plugin: tool.execute.after hook', function () {
  this.timeout(30000);

  let tmpDir;
  let plugin, hooks;

  before(async function () {
    plugin = await loadPlugin(PLUGIN_PATH);
    hooks = await plugin(mockContext());
  });

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-hook-'));
  });

  afterEach(function () {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should silently skip non-edit tools', async function () {
    await hooks['tool.execute.after'](
      { tool: 'read', args: { filePath: '/tmp/test.json' } },
      { result: {} }
    );
  });

  it('should run post-edit hooks for edit tool on a test spec', async function () {
    const specPath = path.join(tmpDir, 'spec.json');
    fs.writeFileSync(specPath, JSON.stringify({
      tests: [{
        testId: 'test-1',
        steps: [{ goTo: 'https://example.com' }]
      }]
    }));

    // Should not throw (post-edit hooks are informational)
    await hooks['tool.execute.after'](
      { tool: 'edit', args: { filePath: specPath } },
      { result: {} }
    );

    // The format hook should have normalized the JSON
    const formatted = fs.readFileSync(specPath, 'utf8');
    const parsed = JSON.parse(formatted);
    assert.ok(Array.isArray(parsed.tests));
    assert.ok(formatted.includes('  '), 'Should be indented with 2 spaces');
  });

  it('should handle missing files gracefully', async function () {
    await hooks['tool.execute.after'](
      { tool: 'write', args: { filePath: path.join(tmpDir, 'does-not-exist.json') } },
      { result: {} }
    );
  });

  it('should handle non-JSON files gracefully', async function () {
    const mdPath = path.join(tmpDir, 'readme.md');
    fs.writeFileSync(mdPath, '# Hello World');

    await hooks['tool.execute.after'](
      { tool: 'edit', args: { filePath: mdPath } },
      { result: {} }
    );
  });
});
