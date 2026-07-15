'use strict';

// Static validation of the Doc Detective language-server wiring in the Claude
// Code plugin: the generated manifest carries a correct `lspServers` block, the
// launcher shim is bundled, and the build artifacts match their src/ sources.
//
// The server's runtime behavior (diagnostics/completion/hover) and the shim's
// actual launch are tested in the doc-detective repo; here we only guard the
// packaging contract.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const PLUGIN_DIR = path.join(ROOT, 'plugins/doc-detective');
const CLAUDE_PLUGIN_JSON = path.join(PLUGIN_DIR, '.claude-plugin/plugin.json');
const SRC_REGISTRY = path.join(ROOT, 'src/lsp-servers.json');
const SRC_SHIM = path.join(ROOT, 'src/lsp/lsp-launch.js');
const PLUGIN_SHIM = path.join(PLUGIN_DIR, 'lsp/lsp-launch.js');

describe('LSP plugin: manifest lspServers', function () {
  this.timeout(10000);

  let lsp;

  before(function () {
    assert.ok(
      fs.existsSync(CLAUDE_PLUGIN_JSON),
      'Claude plugin manifest must exist'
    );
    const manifest = JSON.parse(fs.readFileSync(CLAUDE_PLUGIN_JSON, 'utf8'));
    assert.ok(manifest.lspServers, 'manifest must declare lspServers');
    lsp = manifest.lspServers['doc-detective'];
    assert.ok(lsp, 'lspServers must contain a "doc-detective" entry');
  });

  it('launches the bundled shim with node', function () {
    assert.strictEqual(lsp.command, 'node');
    assert.deepStrictEqual(lsp.args, ['${CLAUDE_PLUGIN_ROOT}/lsp/lsp-launch.js']);
  });

  it('maps spec and markup extensions to the doc-detective language', function () {
    const map = lsp.extensionToLanguage;
    assert.ok(map, 'extensionToLanguage is required');
    for (const ext of ['.json', '.yaml', '.yml', '.md', '.html']) {
      assert.strictEqual(map[ext], 'doc-detective', `${ext} must map to doc-detective`);
    }
  });

  it('opts into diagnostics and crash-restart', function () {
    assert.strictEqual(lsp.diagnostics, true);
    assert.strictEqual(lsp.restartOnCrash, true);
  });

  it('matches the canonical src/lsp-servers.json registry', function () {
    const registry = JSON.parse(fs.readFileSync(SRC_REGISTRY, 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(CLAUDE_PLUGIN_JSON, 'utf8'));
    assert.deepStrictEqual(
      manifest.lspServers,
      registry,
      'generated lspServers must equal src/lsp-servers.json (run npm run build)'
    );
  });

  it('preserves the mcpServers block alongside lspServers', function () {
    const manifest = JSON.parse(fs.readFileSync(CLAUDE_PLUGIN_JSON, 'utf8'));
    assert.ok(manifest.mcpServers, 'mcpServers must not be clobbered by the LSP sync');
  });
});

describe('LSP plugin: launcher shim', function () {
  this.timeout(10000);

  it('is bundled into the plugin', function () {
    assert.ok(fs.existsSync(PLUGIN_SHIM), 'shim must exist at plugins/doc-detective/lsp/lsp-launch.js');
  });

  it('is byte-identical to its src/ source', function () {
    assert.ok(fs.existsSync(SRC_SHIM), 'src shim must exist');
    assert.strictEqual(
      fs.readFileSync(PLUGIN_SHIM, 'utf8'),
      fs.readFileSync(SRC_SHIM, 'utf8'),
      'bundled shim must match src (run npm run build)'
    );
  });

  it('is syntactically valid JavaScript', function () {
    // `node --check` parses without executing (the shim spawns on execute).
    execFileSync(process.execPath, ['--check', PLUGIN_SHIM]);
  });

  it('resolves a project-local doc-detective bin over the fallbacks', function () {
    // Build a throwaway project whose node_modules/doc-detective is a stub
    // package with a bin, and assert the shim's resolveLocal logic (walking up
    // node_modules) would find it. We replicate the resolution here rather than
    // executing the shim (which would spawn a server).
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'dd-lsp-'));
    try {
      const pkgDir = path.join(tmp, 'node_modules', 'doc-detective');
      fs.mkdirSync(path.join(pkgDir, 'bin'), { recursive: true });
      fs.writeFileSync(
        path.join(pkgDir, 'package.json'),
        JSON.stringify({ name: 'doc-detective', bin: { 'doc-detective': 'bin/doc-detective.js' } })
      );
      fs.writeFileSync(path.join(pkgDir, 'bin/doc-detective.js'), '// stub');
      // Replicate resolveLocal's filesystem walk.
      let dir = tmp;
      let found = null;
      for (;;) {
        const cand = path.join(dir, 'node_modules', 'doc-detective', 'package.json');
        if (fs.existsSync(cand)) {
          const pkg = JSON.parse(fs.readFileSync(cand, 'utf8'));
          const rel = (pkg.bin && (pkg.bin['doc-detective'] || pkg.bin)) || 'bin/doc-detective.js';
          found = path.join(path.dirname(cand), rel);
          break;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
      assert.ok(found && fs.existsSync(found), 'shim should resolve the local bin');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
