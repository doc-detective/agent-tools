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
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const PLUGIN_DIR = path.join(ROOT, 'plugins/doc-detective');
const CLAUDE_PLUGIN_JSON = path.join(PLUGIN_DIR, '.claude-plugin/plugin.json');
const SRC_REGISTRY = path.join(ROOT, 'src/lsp-servers.json');
const SRC_SHIM = path.join(ROOT, 'src/lsp/lsp-launch.js');
const PLUGIN_SHIM = path.join(PLUGIN_DIR, 'lsp/lsp-launch.js');

// Requiring the shim runs no side effects — it only launches under
// `require.main === module` — so we can unit-test its real resolvers.
const shim = require('../../src/lsp/lsp-launch.js');

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

  // Build a throwaway project whose node_modules/doc-detective is a stub with
  // the given `bin` field, run the shim's REAL resolveLocal against it, and
  // clean up. Exercises the shipped resolver rather than a copy of its logic.
  function withStubProject(bin, fn) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-lsp-'));
    try {
      const pkgDir = path.join(tmp, 'node_modules', 'doc-detective');
      fs.mkdirSync(path.join(pkgDir, 'bin'), { recursive: true });
      const pkg = { name: 'doc-detective' };
      if (bin !== undefined) pkg.bin = bin;
      fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(pkg));
      fs.writeFileSync(path.join(pkgDir, 'bin/doc-detective.js'), '// stub');
      fn(tmp, pkgDir);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }

  it('resolveLocal finds a project-local bin (object bin form)', function () {
    withStubProject({ 'doc-detective': 'bin/doc-detective.js' }, (tmp, pkgDir) => {
      const spec = shim.resolveLocal(tmp);
      assert.ok(spec, 'should resolve a local install');
      assert.strictEqual(spec.command, process.execPath);
      assert.strictEqual(spec.args[0], path.join(pkgDir, 'bin/doc-detective.js'));
      assert.deepStrictEqual(spec.args.slice(1), ['lsp', '--stdio']);
    });
  });

  it('resolveLocal handles the string bin form and the default fallback', function () {
    withStubProject('bin/doc-detective.js', (tmp, pkgDir) => {
      assert.strictEqual(shim.resolveLocal(tmp).args[0], path.join(pkgDir, 'bin/doc-detective.js'));
    });
    // No `bin` field at all → default to bin/doc-detective.js.
    withStubProject(undefined, (tmp, pkgDir) => {
      assert.strictEqual(shim.resolveLocal(tmp).args[0], path.join(pkgDir, 'bin/doc-detective.js'));
    });
  });

  it('resolveLocal degrades to null for an object bin without a doc-detective key', function () {
    // The bin map names other executables only — there is no doc-detective
    // path, so resolveLocal must NOT coerce the object into "[object Object]";
    // it falls back to bin/doc-detective.js, which the stub also provides.
    withStubProject({ 'other-tool': 'bin/other.js' }, (tmp, pkgDir) => {
      // The stub still has bin/doc-detective.js (the default), so it resolves to that.
      assert.strictEqual(shim.resolveLocal(tmp).args[0], path.join(pkgDir, 'bin/doc-detective.js'));
    });
  });

  it('resolveLocal returns null when doc-detective is not installed', function () {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-lsp-empty-'));
    try {
      assert.strictEqual(shim.resolveLocal(tmp), null);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });

  it('resolveNpx launches via node + the bundled npx-cli.js', function () {
    const spec = shim.resolveNpx();
    // In a standard Node install npm sits beside node, so npx-cli.js resolves.
    assert.strictEqual(spec.command, process.execPath);
    assert.match(spec.args[0], /npx-cli\.js$/);
    assert.deepStrictEqual(spec.args.slice(1), ['--yes', 'doc-detective', 'lsp', '--stdio']);
  });
});
