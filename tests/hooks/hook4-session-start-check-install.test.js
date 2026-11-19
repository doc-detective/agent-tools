'use strict';

const assert = require('assert');
const fs = require('fs');
const { runHook, makeFakeBin, parseOutput } = require('./helpers');

describe('Hook 4: session-start-check-install', function () {
  this.timeout(30000);

  it('should exit 0 and output valid JSON', async function () {
    const result = await runHook('session-start-check-install.sh', '{}');
    assert.strictEqual(result.code, 0);

    const output = parseOutput(result.stdout);
    assert.ok(output, 'should output valid JSON');
    assert.ok(output.additionalContext, 'should have additionalContext');
  });

  it('should report availability status', async function () {
    const result = await runHook('session-start-check-install.sh', '{}');
    const output = parseOutput(result.stdout);
    assert.ok(output, `stdout must be valid JSON, got: ${result.stdout.slice(0, 200)}`);

    const ctx = output.additionalContext;
    assert.ok(typeof ctx === 'string', 'additionalContext must be a string');
    const reportsAvailable = ctx.includes('Tests can be executed directly');
    const suggestsInstall = ctx.includes('No Doc Detective 5 runner was confirmed');
    assert.ok(
      reportsAvailable || suggestsInstall,
      'should report available or suggest installation'
    );
  });

  it('should include installation instructions when not available', async function () {
    // A PATH with only the coreutils the script needs: no npx, docker, or doc-detective
    const fakeBin = makeFakeBin();

    const result = await runHook('session-start-check-install.sh', '{}', {
      env: { PATH: fakeBin, HOME: process.env.HOME },
    });

    fs.rmSync(fakeBin, { recursive: true, force: true });
    assert.strictEqual(result.code, 0);

    const output = parseOutput(result.stdout);
    assert.ok(output.additionalContext.includes('No Doc Detective 5 runner was confirmed'));
    assert.ok(output.additionalContext.includes('npm i -g doc-detective@5'));
    assert.ok(output.additionalContext.includes('docker pull docdetective/docdetective'));
  });

  // A cached image only counts when its `version` label is CLI 5 or later:
  // `latest` can still be a CLI 4 image that misreads CLI 5 specs.
  for (const [label, available] of [['5.0.0', true], ['4.38.1', false]]) {
    it(`should ${available ? '' : 'not '}report a cached ${label} Docker image as available`, async function () {
      // `docker image inspect --format ...` prints the image's version label
      const fakeBin = makeFakeBin({ docker: `echo ${label}` });

      const result = await runHook('session-start-check-install.sh', '{}', {
        env: { PATH: fakeBin, HOME: process.env.HOME },
      });
      fs.rmSync(fakeBin, { recursive: true, force: true });

      const ctx = parseOutput(result.stdout).additionalContext;
      if (available) {
        assert.ok(ctx.includes('Docker image (version: 5.0.0)'), ctx);
      } else {
        assert.ok(ctx.includes('No Doc Detective 5 runner was confirmed'), ctx);
      }
    });
  }

  // A global install only counts when it's CLI 5 or later: an older global
  // CLI misreads CLI 5 specs, so the hook falls through and says why.
  for (const [version, available] of [['5.0.0', true], ['4.26.0', false]]) {
    it(`should ${available ? '' : 'not '}report a global ${version} CLI as available`, async function () {
      const fakeBin = makeFakeBin({ 'doc-detective': `echo ${version}` });

      const result = await runHook('session-start-check-install.sh', '{}', {
        env: { PATH: fakeBin, HOME: process.env.HOME },
      });
      fs.rmSync(fakeBin, { recursive: true, force: true });

      const ctx = parseOutput(result.stdout).additionalContext;
      if (available) {
        assert.ok(ctx.includes('CLI found (version: 5.0.0)'), ctx);
      } else {
        assert.ok(ctx.includes('No Doc Detective 5 runner was confirmed'), ctx);
        assert.ok(ctx.includes('global doc-detective is 4.26.0'), ctx);
      }
    });
  }

  it('should produce well-formed JSON regardless of version output', async function () {
    const result = await runHook('session-start-check-install.sh', '{}');
    const output = parseOutput(result.stdout);
    assert.ok(output, 'stdout must be valid JSON');
    assert.ok(typeof output.additionalContext === 'string');
  });

  it('should handle empty stdin gracefully', async function () {
    const result = await runHook('session-start-check-install.sh', '');
    assert.strictEqual(result.code, 0);
    assert.ok(parseOutput(result.stdout), 'should still produce valid JSON');
  });
});
