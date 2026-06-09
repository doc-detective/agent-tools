'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const PLUGIN_DIR = path.join(ROOT, 'plugins/doc-detective');
const CURSOR_PLUGIN_JSON = path.join(PLUGIN_DIR, '.cursor-plugin/plugin.json');
const CURSOR_HOOKS_JSON = path.join(PLUGIN_DIR, 'hooks/cursor-hooks.json');
const CURSOR_RULE = path.join(PLUGIN_DIR, 'rules/doc-detective.mdc');
const ADAPTER = path.join(PLUGIN_DIR, 'hooks/scripts/cursor-hook-adapter.js');
const PKG_JSON = path.join(ROOT, 'package.json');
const MCP_REGISTRY = path.join(ROOT, 'src/mcp-servers.json');

// Allowed top-level keys per cursor/plugins schemas/plugin.schema.json
// (additionalProperties: false). Keeping this in sync guards against a manifest
// key Cursor would reject at publish time.
const ALLOWED_MANIFEST_KEYS = new Set([
  'name', 'displayName', 'description', 'version', 'author', 'publisher',
  'homepage', 'repository', 'license', 'logo', 'keywords', 'category', 'tags',
  'commands', 'agents', 'skills', 'rules', 'hooks', 'mcpServers',
]);

/** Run the Cursor hook adapter with a target script and a Cursor payload. */
function runAdapter(targetScript, cursorPayload, opts = {}) {
  return new Promise((resolve) => {
    const child = execFile('node', [ADAPTER, targetScript], {
      timeout: opts.timeout || 20000,
      env: { ...process.env, ...opts.env },
    }, (err, stdout, stderr) => {
      resolve({ code: err ? (err.code || 1) : 0, stdout: stdout || '', stderr: stderr || '' });
    });
    child.stdin.write(JSON.stringify(cursorPayload));
    child.stdin.end();
  });
}

describe('Cursor plugin: manifest', function () {
  this.timeout(10000);

  let manifest;
  before(function () {
    assert.ok(fs.existsSync(CURSOR_PLUGIN_JSON),
      'Cursor manifest must exist at plugins/doc-detective/.cursor-plugin/plugin.json');
    manifest = JSON.parse(fs.readFileSync(CURSOR_PLUGIN_JSON, 'utf8'));
  });

  it('should have required name field (kebab-case)', function () {
    assert.strictEqual(manifest.name, 'doc-detective');
    assert.match(manifest.name, /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/);
  });

  it('should have a semver version matching package.json', function () {
    const pkg = JSON.parse(fs.readFileSync(PKG_JSON, 'utf8'));
    assert.match(manifest.version, /^\d+\.\d+\.\d+/);
    assert.strictEqual(manifest.version, pkg.version);
  });

  it('should have a meaningful description', function () {
    assert.ok(manifest.description && manifest.description.length > 10);
  });

  it('should declare component paths', function () {
    assert.strictEqual(manifest.skills, './skills/');
    assert.strictEqual(manifest.agents, './agents/');
    assert.strictEqual(manifest.rules, './rules/');
    assert.strictEqual(manifest.hooks, './hooks/cursor-hooks.json');
  });

  it('should have author, repository, and homepage', function () {
    assert.ok(manifest.author && manifest.author.name, 'author.name is required');
    assert.ok(manifest.repository, 'repository is required');
    assert.ok(manifest.homepage, 'homepage is required');
  });

  it('should only use schema-allowed top-level keys', function () {
    for (const key of Object.keys(manifest)) {
      assert.ok(ALLOWED_MANIFEST_KEYS.has(key),
        `manifest key "${key}" is not allowed by the Cursor plugin schema`);
    }
  });

  it('should reference component directories that exist', function () {
    assert.ok(fs.existsSync(path.join(PLUGIN_DIR, 'skills')), 'skills/ must exist');
    assert.ok(fs.existsSync(path.join(PLUGIN_DIR, 'agents')), 'agents/ must exist');
    assert.ok(fs.existsSync(path.join(PLUGIN_DIR, 'rules')), 'rules/ must exist');
    assert.ok(fs.existsSync(CURSOR_HOOKS_JSON), 'hooks/cursor-hooks.json must exist');
  });
});

describe('Cursor plugin: inline MCP server', function () {
  this.timeout(10000);

  it('should register every enabled registry server inline with type http and the cursor client', function () {
    const registry = JSON.parse(fs.readFileSync(MCP_REGISTRY, 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(CURSOR_PLUGIN_JSON, 'utf8'));
    assert.ok(manifest.mcpServers && typeof manifest.mcpServers === 'object',
      'mcpServers must be an inline object map');

    for (const [name, spec] of Object.entries(registry)) {
      if (spec.enabled === false) continue;
      const entry = manifest.mcpServers[name];
      assert.ok(entry, `${name} must be present in mcpServers`);
      assert.strictEqual(entry.type, 'http', `${name} must declare type: http`);
      assert.strictEqual(entry.url, spec.url, `${name} url must match registry`);
      const expected = (spec.clientNames && spec.clientNames.cursor) || 'cursor';
      assert.strictEqual(entry.headers['X-DD-Client'], expected,
        `${name} must identify the Cursor client`);
    }
  });
});

describe('Cursor plugin: rules', function () {
  this.timeout(10000);

  it('should render a .mdc rule with frontmatter', function () {
    assert.ok(fs.existsSync(CURSOR_RULE), 'rules/doc-detective.mdc must exist');
    const content = fs.readFileSync(CURSOR_RULE, 'utf8');
    assert.match(content, /^---\r?\n[\s\S]*?\r?\n---/, 'rule must have frontmatter');
    assert.match(content, /description:/, 'rule frontmatter must include a description');
  });
});

describe('Cursor plugin: hooks config', function () {
  this.timeout(10000);

  let hooks;
  before(function () {
    hooks = JSON.parse(fs.readFileSync(CURSOR_HOOKS_JSON, 'utf8'));
  });

  it('should use version 1 and the Cursor event names', function () {
    assert.strictEqual(hooks.version, 1);
    assert.ok(Array.isArray(hooks.hooks.sessionStart), 'sessionStart array required');
    assert.ok(Array.isArray(hooks.hooks.afterFileEdit), 'afterFileEdit array required');
  });

  it('should route every command through the adapter via CURSOR_PLUGIN_ROOT', function () {
    const all = [...hooks.hooks.sessionStart, ...hooks.hooks.afterFileEdit];
    for (const h of all) {
      assert.match(h.command, /cursor-hook-adapter\.js/, 'must invoke the adapter');
      assert.match(h.command, /\$\{CURSOR_PLUGIN_ROOT\}/, 'must use CURSOR_PLUGIN_ROOT');
    }
  });

  it('should bundle the adapter script', function () {
    assert.ok(fs.existsSync(ADAPTER), 'cursor-hook-adapter.js must exist in the plugin');
  });
});

describe('Cursor plugin: hook adapter behavior', function () {
  this.timeout(30000);

  it('sessionStart -> additional_context', async function () {
    const r = await runAdapter('session-start-check-install.sh',
      { hook_event_name: 'sessionStart', session_id: 'x' });
    assert.strictEqual(r.code, 0);
    const out = JSON.parse(r.stdout.trim());
    assert.ok(typeof out.additional_context === 'string' && out.additional_context.length > 0);
  });

  it('afterFileEdit + antipattern -> corrective agent_message, exit 0 (cannot block post-hoc)', async function () {
    const bad = '{"' + 'action' + '": "click", "selector": "Save"}';
    const r = await runAdapter('pre-edit-block-action-antipattern.js', {
      hook_event_name: 'afterFileEdit',
      file_path: '/tmp/foo.spec.json',
      edits: [{ old_string: '', new_string: bad }],
    });
    assert.strictEqual(r.code, 0, 'afterFileEdit must not hard-block');
    const out = JSON.parse(r.stdout.trim());
    assert.ok(out.agent_message && /Doc Detective/.test(out.agent_message));
    assert.strictEqual(out.permission, undefined, 'no permission gate on afterFileEdit');
  });

  it('preToolUse + antipattern -> permission deny, exit 2 (hard block at a pre-gate)', async function () {
    const bad = '{"' + 'action' + '": "goTo", "url": "x"}';
    const r = await runAdapter('pre-edit-block-action-antipattern.js', {
      hook_event_name: 'preToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/foo.spec.json', content: bad },
    });
    assert.strictEqual(r.code, 2, 'pre-gate antipattern must block with exit 2');
    const out = JSON.parse(r.stdout.trim());
    assert.strictEqual(out.permission, 'deny');
    assert.ok(out.agent_message && out.user_message);
  });

  it('afterFileEdit on a non-spec file -> silent, exit 0', async function () {
    const r = await runAdapter('pre-edit-block-action-antipattern.js', {
      hook_event_name: 'afterFileEdit',
      file_path: '/tmp/readme.md',
      edits: [{ old_string: '', new_string: '# Just prose' }],
    });
    assert.strictEqual(r.code, 0);
    assert.strictEqual(r.stdout.trim(), '', 'no output for non-Doc-Detective content');
  });

  it('rejects a path-traversal target script with exit 1 (fail open, no hard block)', async function () {
    const r = await runAdapter('../../../../../../tmp/evil.js', {
      hook_event_name: 'afterFileEdit',
      file_path: '/tmp/x.spec.json',
      edits: [{ old_string: '', new_string: '{}' }],
    });
    assert.strictEqual(r.code, 1, 'traversal must exit 1 (fail open), not 2 (block)');
    assert.match(r.stderr, /invalid target script/);
    assert.strictEqual(r.stdout.trim(), '', 'must not emit a hook response');
  });
});

describe('Cursor plugin: build version sync', function () {
  this.timeout(30000);

  it('should sync version + inline mcpServers into the Cursor manifest after build', function (done) {
    execFile('node', ['build.js', '--no-scripts'], { cwd: ROOT, timeout: 25000 }, (err) => {
      if (err) return done(err);
      const pkg = JSON.parse(fs.readFileSync(PKG_JSON, 'utf8'));
      const manifest = JSON.parse(fs.readFileSync(CURSOR_PLUGIN_JSON, 'utf8'));
      assert.strictEqual(manifest.version, pkg.version);
      assert.ok(manifest.mcpServers && manifest.mcpServers['doc-detective'],
        'build should keep the inline mcpServers map');
      assert.ok(fs.existsSync(CURSOR_RULE), 'build should render the .mdc rule');
      done();
    });
  });
});
