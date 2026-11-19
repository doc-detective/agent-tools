// Runs Claude Code headless with only this repo's plugin loaded, and turns its
// stream-json output into what the eval runners need: the served model, summed
// usage, a report-shaped transcript, and every tool call in order.
//
// Isolation: --setting-sources "" skips user, project, and local settings, so the
// user's installed plugins and their skills don't load, and --strict-mcp-config
// skips MCP servers. --plugin-dir then loads the plugin under test; only Claude
// Code's built-in skills compete with it. (--safe-mode is not usable here: it
// also disables skills from --plugin-dir.)

import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const PLUGIN_DIR = join(REPO, 'plugins', 'doc-detective');

/** Rebuild plugins/doc-detective from src/ so hillclimb edits to src/ take effect. */
export function buildPlugin() {
  execFileSync(process.execPath, ['build.js', '--no-scripts'], { cwd: REPO, stdio: 'ignore' });
}

export function tempWorkspace(prefix) {
  return mkdtempSync(join(tmpdir(), `dd-eval-${prefix}-`));
}
export const removeWorkspace = dir => rmSync(dir, { recursive: true, force: true });

/**
 * @param {object} o
 * @param {string} o.prompt
 * @param {string} o.cwd          workspace the session runs in
 * @param {string} o.model
 * @param {string[]} [o.disallowedTools]
 * @param {(ev: object, state: object) => boolean} [o.stopWhen]  kill the session once this returns true
 * @param {number} [o.maxTurns]
 * @param {object} [o.env]      extra environment for the session
 */
export function runClaude({ prompt, cwd, model, disallowedTools = [], stopWhen, maxTurns, env }) {
  const args = [
    '-p', prompt,
    '--output-format', 'stream-json', '--verbose',
    '--model', model,
    '--setting-sources', '',
    '--plugin-dir', PLUGIN_DIR,
    '--strict-mcp-config',
    '--no-session-persistence',
    '--permission-mode', 'bypassPermissions',
  ];
  if (disallowedTools.length) args.push('--disallowed-tools', ...disallowedTools);
  if (maxTurns) args.push('--max-turns', String(maxTurns));

  return new Promise((resolvePromise, reject) => {
    const child = spawn('claude', args, { cwd, env: env ? { ...process.env, ...env } : process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    const state = { init: null, model: null, usageById: new Map(), toolCalls: [], transcript: [],
                    result: null, stopped: false, stderr: '' };
    let buf = '';
    child.stdout.on('data', chunk => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let ev;
        try { ev = JSON.parse(line); } catch { continue; }
        consume(ev, state);
        if (!state.stopped && stopWhen?.(ev, state)) {
          state.stopped = true;
          child.kill();
        }
      }
    });
    child.stderr.on('data', d => { state.stderr += d; });
    child.on('error', reject);
    child.on('close', code => {
      if (!state.init && !state.stopped) {
        const e = new Error(`claude exited ${code} before starting: ${state.stderr.slice(0, 500)}`);
        e.failure_class = 'harness';
        return reject(e);
      }
      // The result event carries the session's final usage. Per-message usage
      // in the stream is a mid-stream snapshot that undercounts output, so it's
      // only the fallback for a session the eval stopped before it finished.
      const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
      const source = state.result?.usage ? [state.result.usage] : state.usageById.values();
      for (const u of source)
        for (const k of Object.keys(usage)) usage[k] += u?.[k] ?? 0;
      const transient = /overloaded|rate.?limit|529|429/i.test(state.stderr + JSON.stringify(state.result ?? ''));
      if (state.result?.is_error && transient) {
        const e = new Error(`transient API error: ${String(state.result.result ?? '').slice(0, 300)}`);
        e.status = 529;
        return reject(e);
      }
      resolvePromise({
        model: state.model,
        usage,
        cost_usd_reported: state.result?.total_cost_usd,
        num_turns: state.result?.num_turns,
        result_subtype: state.result?.subtype ?? (state.stopped ? 'stopped_by_eval' : 'no_result'),
        stopped: state.stopped,
        init: state.init,
        toolCalls: state.toolCalls,
        transcript: state.transcript,
        finalText: typeof state.result?.result === 'string' ? state.result.result : null,
        exitCode: code,
      });
    });
  });
}

function consume(ev, s) {
  if (ev.type === 'system' && ev.subtype === 'init') {
    s.init = { model: ev.model, tools: ev.tools, skills: ev.skills, plugins: ev.plugins,
               slash_commands: ev.slash_commands, agents: ev.agents };
    s.transcript.push({ role: 'system', content: `Claude Code session. Model ${ev.model}. Plugins: ${JSON.stringify(ev.plugins ?? [])}. Skills: ${JSON.stringify(ev.skills ?? [])}` });
    return;
  }
  if (ev.type === 'assistant' && ev.message) {
    const m = ev.message;
    if (m.model) s.model = m.model;
    if (m.id && m.usage) s.usageById.set(m.id, m.usage);
    for (const b of m.content ?? []) {
      if (b.type === 'text' && b.text?.trim()) s.transcript.push({ role: 'assistant', content: b.text });
      else if (b.type === 'thinking' && b.thinking) s.transcript.push({ role: 'assistant', content: '', thinking: b.thinking });
      else if (b.type === 'tool_use') {
        s.toolCalls.push({ name: b.name, input: b.input, id: b.id });
        s.transcript.push({ role: 'tool_call', name: b.name, content: JSON.stringify(b.input, null, 2) });
      }
    }
    return;
  }
  if (ev.type === 'user' && Array.isArray(ev.message?.content)) {
    for (const b of ev.message.content) {
      if (b.type !== 'tool_result') continue;
      const text = Array.isArray(b.content) ? b.content.map(c => c.text ?? '').join('\n') : String(b.content ?? '');
      s.transcript.push({ role: 'tool_result', content: text.length > 20000 ? text.slice(0, 20000) + '\n…[truncated]' : text });
    }
    return;
  }
  if (ev.type === 'result') s.result = ev;
}
