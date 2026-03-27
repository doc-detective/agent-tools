'use strict';

const assert = require('assert');
const { runHook, parseOutput } = require('./helpers');

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
    const suggestsInstall = ctx.includes('not installed');
    assert.ok(
      reportsAvailable || suggestsInstall,
      'should report available or suggest installation'
    );
  });

  it('should include installation instructions when not available', async function () {
    // Create a minimal PATH with only coreutils (bash, cat, printf, sed, tr, timeout)
    // but without npx, docker, or doc-detective
    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), 'hook4-fakebin-'));
    // Symlink only the tools the script needs to run
    for (const tool of ['bash', 'cat', 'printf', 'sed', 'tr', 'timeout']) {
      try {
        const realPath = require('child_process')
          .execFileSync('which', [tool], { encoding: 'utf8' }).trim();
        if (realPath) fs.symlinkSync(realPath, path.join(fakeBin, tool));
      } catch { /* tool not found, skip */ }
    }

    const result = await runHook('session-start-check-install.sh', '{}', {
      env: { PATH: fakeBin, HOME: process.env.HOME },
    });

    fs.rmSync(fakeBin, { recursive: true, force: true });
    assert.strictEqual(result.code, 0);

    const output = parseOutput(result.stdout);
    assert.ok(output.additionalContext.includes('not installed'));
    assert.ok(output.additionalContext.includes('npm i -g doc-detective'));
    assert.ok(output.additionalContext.includes('npx doc-detective'));
    assert.ok(output.additionalContext.includes('Docker'));
  });

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
