'use strict';

const { execFile } = require('child_process');
const path = require('path');

const SCRIPTS_DIR = path.resolve(__dirname, '../../src/hooks/scripts');

/**
 * Run a hook script with JSON piped to stdin.
 * Returns { code, stdout, stderr }.
 */
function runHook(scriptName, stdinData, opts = {}) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  const isBash = scriptName.endsWith('.sh');
  const cmd = isBash ? 'bash' : 'node';

  return new Promise((resolve) => {
    const child = execFile(cmd, [scriptPath], {
      timeout: opts.timeout || 15000,
      env: { ...process.env, ...opts.env },
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
  parseOutput,
  runClaude,
  runGemini,
  isClaudeAvailable,
  isGeminiAvailable,
};
