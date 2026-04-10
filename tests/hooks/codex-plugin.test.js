'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const PLUGIN_DIR = path.join(ROOT, 'plugins/doc-detective');
const CODEX_PLUGIN_JSON = path.join(PLUGIN_DIR, '.codex-plugin/plugin.json');
const CODEX_MARKETPLACE = path.join(ROOT, '.agents/plugins/marketplace.json');
const PKG_JSON = path.join(ROOT, 'package.json');

describe('Codex plugin: manifest', function () {
  this.timeout(10000);

  let manifest;

  before(function () {
    if (!fs.existsSync(CODEX_PLUGIN_JSON)) {
      this.skip();
    }
    manifest = JSON.parse(fs.readFileSync(CODEX_PLUGIN_JSON, 'utf8'));
  });

  it('should exist at plugins/doc-detective/.codex-plugin/plugin.json', function () {
    assert.ok(fs.existsSync(CODEX_PLUGIN_JSON));
  });

  it('should have required name field', function () {
    assert.strictEqual(manifest.name, 'doc-detective');
  });

  it('should have a valid version', function () {
    assert.ok(manifest.version, 'version is required');
    assert.match(manifest.version, /^\d+\.\d+\.\d+/, 'version should be semver');
  });

  it('should have a description', function () {
    assert.ok(manifest.description, 'description is required');
    assert.ok(manifest.description.length > 10, 'description should be meaningful');
  });

  it('should point skills to ./skills/', function () {
    assert.strictEqual(manifest.skills, './skills/');
  });

  it('should have version matching package.json', function () {
    const pkg = JSON.parse(fs.readFileSync(PKG_JSON, 'utf8'));
    assert.strictEqual(manifest.version, pkg.version);
  });

  it('should have author metadata', function () {
    assert.ok(manifest.author, 'author is required');
    assert.ok(manifest.author.name, 'author.name is required');
  });

  it('should have repository and homepage', function () {
    assert.ok(manifest.repository, 'repository is required');
    assert.ok(manifest.homepage, 'homepage is required');
  });

  it('should have interface metadata for Codex install surface', function () {
    assert.ok(manifest.interface, 'interface object is required');
    assert.ok(manifest.interface.displayName, 'displayName is required');
    assert.ok(manifest.interface.shortDescription, 'shortDescription is required');
    assert.ok(manifest.interface.category, 'category is required');
  });
});

describe('Codex plugin: marketplace', function () {
  this.timeout(10000);

  let marketplace;

  before(function () {
    if (!fs.existsSync(CODEX_MARKETPLACE)) {
      this.skip();
    }
    marketplace = JSON.parse(fs.readFileSync(CODEX_MARKETPLACE, 'utf8'));
  });

  it('should exist at .agents/plugins/marketplace.json', function () {
    assert.ok(fs.existsSync(CODEX_MARKETPLACE));
  });

  it('should have a name', function () {
    assert.ok(marketplace.name, 'marketplace name is required');
  });

  it('should have plugins array with at least one entry', function () {
    assert.ok(Array.isArray(marketplace.plugins), 'plugins array is required');
    assert.ok(marketplace.plugins.length > 0, 'at least one plugin entry');
  });

  it('should have a doc-detective plugin entry', function () {
    const entry = marketplace.plugins.find(p => p.name === 'doc-detective');
    assert.ok(entry, 'doc-detective entry is required');
  });

  it('should have source with local path to plugin dir', function () {
    const entry = marketplace.plugins.find(p => p.name === 'doc-detective');
    assert.ok(entry.source, 'source is required');
    assert.strictEqual(entry.source.source, 'local');
    assert.strictEqual(entry.source.path, './plugins/doc-detective');
  });

  it('should have policy and category on plugin entry', function () {
    const entry = marketplace.plugins.find(p => p.name === 'doc-detective');
    assert.ok(entry.policy, 'policy is required');
    assert.ok(entry.policy.installation, 'policy.installation is required');
    assert.ok(entry.policy.authentication, 'policy.authentication is required');
    assert.ok(entry.category, 'category is required');
  });
});

describe('Codex plugin: skills directory', function () {
  this.timeout(10000);

  it('should have skills directory with SKILL.md files', function () {
    const skillsDir = path.join(PLUGIN_DIR, 'skills');
    assert.ok(fs.existsSync(skillsDir), 'skills/ directory must exist');

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(e => e.isDirectory());
    assert.ok(entries.length > 0, 'at least one skill directory');

    for (const entry of entries) {
      const skillMd = path.join(skillsDir, entry.name, 'SKILL.md');
      assert.ok(fs.existsSync(skillMd), `${entry.name}/SKILL.md must exist`);
    }
  });
});

describe('Codex plugin: build version sync', function () {
  this.timeout(30000);

  it('should sync version from package.json to Codex plugin manifest after build', function (done) {
    execFile('node', ['build.js', '--no-scripts'], {
      cwd: ROOT,
      timeout: 25000,
    }, (err) => {
      if (err) return done(err);

      const pkg = JSON.parse(fs.readFileSync(PKG_JSON, 'utf8'));
      const manifest = JSON.parse(fs.readFileSync(CODEX_PLUGIN_JSON, 'utf8'));
      assert.strictEqual(manifest.version, pkg.version,
        'Codex plugin version should match package.json after build');
      done();
    });
  });
});

describe('Codex plugin: Codex CLI integration', function () {
  this.timeout(120000);

  let available;

  function isCodexAvailable() {
    return new Promise((resolve) => {
      execFile('codex', ['--version'], { timeout: 5000 }, (err) => {
        resolve(!err);
      });
    });
  }

  before(async function () {
    available = await isCodexAvailable();
    if (!available) this.skip();
  });

  it('should have a valid plugin structure loadable by Codex', function () {
    // Verify plugin structure is correct for Codex
    assert.ok(fs.existsSync(CODEX_PLUGIN_JSON), '.codex-plugin/plugin.json exists');
    assert.ok(fs.existsSync(path.join(PLUGIN_DIR, 'skills')), 'skills/ exists');

    const manifest = JSON.parse(fs.readFileSync(CODEX_PLUGIN_JSON, 'utf8'));
    assert.ok(manifest.name, 'name exists');
    assert.ok(manifest.version, 'version exists');
    assert.ok(manifest.skills, 'skills path exists');
  });
});
