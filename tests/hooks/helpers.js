'use strict';

const { execFile, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPTS_DIR = path.resolve(__dirname, '../../src/hooks/scripts');

/**
 * Run a hook script with JSON piped to stdin.
 * Returns { code, stdout, stderr }.
 *
 * `opts.env.PATH` is applied inside bash, not to the spawn: on Windows, Node
 * looks `bash` up in the child's PATH, which a fake bin doesn't contain.
 */
function runHook(scriptName, stdinData, opts = {}) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  const isBash = scriptName.endsWith('.sh');
  const { PATH: hookPath, ...env } = opts.env || {};
  const [cmd, args] = isBash && hookPath
    ? ['bash', ['-c', 'PATH="$HOOK_PATH" exec "$BASH" "$0"', scriptPath]]
    : [isBash ? 'bash' : 'node', [scriptPath]];

  return new Promise((resolve) => {
    const child = execFile(cmd, args, {
      timeout: opts.timeout || 15000,
      env: { ...process.env, ...env, ...(hookPath && { HOOK_PATH: hookPath }) },
    }, (err, stdout, stderr) => {
      resolve({
        code: err ? (err.code || 1) : 0,
        stdout: stdout || '',
        stderr: stderr || '',
      });
    });

    const input = typeof stdinData === 'string'
      ? stdinData
      : JSON.stringify(stdinData);
    child.stdin.write(input);
    child.stdin.end();
  });
}

/**
 * Make a temp bin dir holding the coreutils the bash hooks need, plus
 * `stubs` ({ name: scriptBody }). Wrapper scripts, not symlinks: Windows
 * can't follow a symlink to a Git Bash path like /usr/bin/cat. A tool the
 * host lacks (macOS has no `timeout` by default) is left out.
 */
function makeFakeBin(stubs = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-fakebin-'));
  const scripts = { ...stubs };
  for (const tool of ['cat', 'sed', 'tr', 'timeout']) {
    try {
      const real = execFileSync('bash', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).trim();
      scripts[tool] ??= `exec ${real} "$@"`;
    } catch { /* not on this host */ }
  }
  for (const [name, body] of Object.entries(scripts)) {
    fs.writeFileSync(path.join(dir, name), `#!/bin/bash\n${body}\n`, { mode: 0o755 });
  }
  return dir;
}

/**
 * Parse stdout as JSON. Returns null if not valid JSON.
 */
function parseOutput(stdout) {
  try { return JSON.parse(stdout.trim()); }
  catch { return null; }
}

/**
 * Run Claude Code with the plugin loaded and return its text output.
 * Requires `claude` CLI on PATH. Skips if not available.
 */
function runClaude(prompt, opts = {}) {
  const pluginDir = path.resolve(__dirname, '../../plugins/doc-detective');
  return new Promise((resolve, reject) => {
    execFile('claude', [
      '--plugin-dir', pluginDir,
      '--print',
      '--dangerously-skip-permissions',
      '--output-format', 'text',
      prompt,
    ], {
      timeout: opts.timeout || 60000,
      env: { ...process.env, ...opts.env },
    }, (err, stdout, stderr) => {
      if (err && err.code === 'ENOENT') {
        return reject(new Error('claude CLI not found'));
      }
      resolve({
        code: err ? (err.code || 1) : 0,
        stdout: stdout || '',
        stderr: stderr || '',
      });
    });
  });
}

/**
 * Check if Claude CLI is available.
 */
function isClaudeAvailable() {
  return new Promise((resolve) => {
    execFile('claude', ['--version'], { timeout: 5000 }, (err) => {
      resolve(!err);
    });
  });
}

/**
 * Run Gemini CLI with the extension loaded and return its text output.
 * Requires `gemini` CLI on PATH and the doc-detective extension linked.
 */
function runGemini(prompt, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile('gemini', [
      '-p', prompt,
      '--yolo',
    ], {
      timeout: opts.timeout || 90000,
      cwd: opts.cwd || path.resolve(__dirname, '../..'),
      env: { ...process.env, ...opts.env },
    }, (err, stdout, stderr) => {
      if (err && err.code === 'ENOENT') {
        return reject(new Error('gemini CLI not found'));
      }
      resolve({
        code: err ? (err.code || 1) : 0,
        stdout: stdout || '',
        stderr: stderr || '',
      });
    });
  });
}

/**
 * Check if Gemini CLI is available.
 */
function isGeminiAvailable() {
  return new Promise((resolve) => {
    execFile('gemini', ['--version'], { timeout: 5000 }, (err) => {
      resolve(!err);
    });
  });
}

module.exports = {
  SCRIPTS_DIR,
  runHook,
  makeFakeBin,
  parseOutput,
  runClaude,
  runGemini,
  isClaudeAvailable,
  isGeminiAvailable,
};
