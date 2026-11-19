//
// Spec-generation eval. Each case is one documentation page. Claude Code, with
// only this repo's plugin loaded, runs the generate skill on it in a fresh
// workspace. The grade runs the spec it wrote with Doc Detective and compares
// its steps to the steps a human checked the page needs.
//
// Two slices:
//   web    evals/spec-generation/cases/<id>/        docs for doc-detective's local
//          test server (pages on :8092, API on :8093)
//   manni  evals/spec-generation/cases-manni/<id>/  real manni CLI docs with their
//          inline tests removed; generated in, and run against, an export of manni
//
// Environment (see evals/README.md):
//   DD_REPO        doc-detective checkout with `npm ci` done; its test servers are
//                  started here when :8092 isn't already up (web slice)
//   MANNI_DIR      manni clone at the case commit, built (`npm ci && npm run build`)
//   MANNI_PREFIX   npm prefix the manni CLI is linked into (`npm link` with npm_config_prefix);
//                  its bin dir goes first on PATH and npx resolves `@hawkeyexl/manni` from it
//   DD_NODE_DIR    optional: a Node >= 22.22.2 / 24.15 directory put first on PATH
//                  for Doc Detective (its Appium refuses older Node)

import { cpSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { tempWorkspace } from '../lib/claude-run.mjs';

const WIN = process.platform === 'win32';

const EVAL_DIR = dirname(fileURLToPath(import.meta.url));
const DD_VERSION = '5.5.0';
const MANNI_COMMIT = '3a8b3d51399c4bac38021656b338af0f57376e88';
const SEP = WIN ? ';' : ':';

function ddEnv(extraPath = []) {
  const path = [...extraPath, process.env.DD_NODE_DIR, process.env.PATH].filter(Boolean).join(SEP);
  return { ...process.env, PATH: path, Path: path };
}

export async function loadCases() {
  const cases = [];
  for (const [slice, dir] of [['web', 'cases'], ['manni', 'cases-manni']]) {
    for (const id of readdirSync(join(EVAL_DIR, dir)).sort()) {
      const cdir = join(EVAL_DIR, dir, id);
      if (!statSync(cdir).isDirectory()) continue;
      const expected = JSON.parse(readFileSync(join(cdir, 'expected.json'), 'utf8'));
      const docFile = slice === 'web' ? 'doc.md' : 'doc.mdx';
      // web docs go to docs/<id>.md; manni docs go back to their real path.
      const docPath = slice === 'web'
        ? `docs/${id}.md`
        : expected.source.replace(/^manni\//, '').replace(/@[0-9a-f]+$/, '');
      const steps = expected.steps.length;
      cases.push({
        id: `${slice}-${id}`, slice, cdir, docFile, docPath, expected,
        prompt: `/doc-detective:doc-detective-generate ${docPath} --output tests/${id}.spec.json`,
        tags: [slice, steps <= 5 ? 'small' : steps <= 12 ? 'medium' : 'large'],
        meta: { expected_steps: steps },
      });
    }
  }
  const only = process.env.EVAL_ONLY?.split(',').map(s => s.trim()).filter(Boolean);
  return only?.length ? cases.filter(c => only.includes(c.id)) : cases;
}

// --- workspaces -------------------------------------------------------------

export function makeWorkspace(c) {
  const ws = tempWorkspace(`specgen-${c.slice}`);
  if (c.slice === 'manni') {
    const dir = process.env.MANNI_DIR;
    if (!dir) throw Object.assign(new Error('MANNI_DIR is not set'), { failure_class: 'harness' });
    // A plain export (no .git), so the page's original tests aren't one `git show` away.
    const tar = execFileSync('git', ['-C', dir, 'archive', MANNI_COMMIT], { maxBuffer: 1 << 30 });
    execFileSync('tar', ['-x', '-C', ws], { input: tar });
  }
  mkdirSync(join(ws, dirname(c.docPath)), { recursive: true });
  cpSync(join(c.cdir, c.docFile), join(ws, c.docPath));
  mkdirSync(join(ws, 'tests'), { recursive: true });
  if (c.slice === 'manni') {
    // manni's docs check git-ignore state, so the export needs a repo. Its one
    // commit holds the page with its tests already removed.
    const git = (...a) => execFileSync('git', ['-c', 'user.name=eval', '-c', 'user.email=eval@example.invalid', ...a], { cwd: ws, stdio: 'ignore' });
    git('init', '-q'); git('add', '-A'); git('commit', '-qm', 'eval workspace');
  }
  return ws;
}

// --- test servers (web slice) -----------------------------------------------

let servers = null;
export async function ensureServers() {
  if (servers) return servers;
  const up = async () => { try { return (await fetch('http://localhost:8092')).ok; } catch { return false; } };
  if (await up()) return (servers = Promise.resolve('external'));
  const repo = process.env.DD_REPO;
  if (!repo) throw Object.assign(new Error('test server not running on :8092 and DD_REPO is not set'), { failure_class: 'harness' });
  const child = spawn(process.execPath, ['test/server/start.js'], { cwd: repo, stdio: 'ignore' });
  process.on('exit', () => child.kill());
  servers = (async () => {
    for (let i = 0; i < 60; i++) { if (await up()) return 'started'; await new Promise(r => setTimeout(r, 500)); }
    throw Object.assign(new Error('test server did not come up on :8092'), { failure_class: 'harness' });
  })();
  return servers;
}

/** The spec the session wrote: the requested path, else any new spec-like JSON. */
export function findSpec(ws, c) {
  const want = join(ws, 'tests', `${c.id.replace(/^(web|manni)-/, '')}.spec.json`);
  const candidates = [want];
  const walk = (d, depth) => {
    if (depth > 3) return;
    for (const n of readdirSync(d, { withFileTypes: true })) {
      if (n.name === 'node_modules' || n.name.startsWith('.git')) continue;
      const p = join(d, n.name);
      if (n.isDirectory()) walk(p, depth + 1);
      else if (/\.spec\.json$/i.test(n.name)) candidates.push(p);
    }
  };
  walk(join(ws, 'tests'), 0);
  for (const p of candidates) {
    let text; try { text = readFileSync(p, 'utf8'); } catch { continue; }
    let json = null; try { json = JSON.parse(text); } catch {}
    return { path: p, at_requested_path: p === want, text, json };
  }
  return { path: null, text: null, json: null };
}

export function runDocDetective(c, ws, specPath) {
  const out = join(ws, '.dd-out');
  const config = c.slice === 'web' ? join(EVAL_DIR, 'doc-detective.config.json') : join(ws, '.doc-detective.json');
  const args = ['-y', `doc-detective@${DD_VERSION}`, '-i', specPath, '-c', config,
                '-o', join(out, 'results.json'), '--output-dir', out,
                '--no-auto-update', '--no-telemetry', '--no-hints', '--no-input'];
  const prefix = process.env.MANNI_PREFIX;
  const env = c.slice === 'manni'
    ? { ...ddEnv([WIN ? prefix : join(prefix, 'bin')]), npm_config_prefix: prefix }
    : ddEnv();
  return new Promise(resolvePromise => {
    const child = spawn(WIN ? 'npx.cmd' : 'npx', args, { cwd: ws, env, shell: WIN, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    child.stdout.on('data', d => { log += d; });
    child.stderr.on('data', d => { log += d; });
    const timer = setTimeout(() => child.kill(), 300_000);
    // A spawn failure (npx missing, not executable) emits 'error' instead of
    // 'close'; without a listener it would crash the whole run.
    child.on('error', err => {
      clearTimeout(timer);
      resolvePromise({ code: null, summary: null, log: `Couldn't start Doc Detective: ${err.message}` });
    });
    child.on('close', code => {
      clearTimeout(timer);
      let summary = null;
      try { summary = JSON.parse(readFileSync(join(out, 'results.json'), 'utf8')).summary; } catch {}
      resolvePromise({ code, summary, log: log.slice(-4000) });
    });
  });
}

// --- grade ------------------------------------------------------------------

const NON_ACTION_KEYS = new Set(['stepId', 'description', 'unsafe', 'outputs', 'variables', 'breakpoint', 'location', '$schema']);
const actionOf = step => Object.keys(step ?? {}).find(k => !NON_ACTION_KEYS.has(k));
const norm = s => String(s).replace(/\\/g, '').toLowerCase();

export function stepsOf(spec) {
  const tests = Array.isArray(spec?.tests) ? spec.tests : [];
  return tests.flatMap(t => Array.isArray(t?.steps) ? t.steps : []);
}

/** One-to-one, in document order: each expected step claims the first unused generated step that matches. */
export function coverage(expected, steps) {
  const used = new Set();
  const misses = [];
  for (const e of expected) {
    const types = [].concat(e.stepType ?? e.action);
    const all = [].concat(e.match ?? []).map(norm);
    const any = [].concat(e.match_any ?? []).map(norm);
    const hit = s => {
      if (!types.includes(actionOf(s))) return false;
      const text = norm(JSON.stringify(s));
      return all.every(m => text.includes(m)) && (!any.length || any.some(m => text.includes(m)));
    };
    let i = steps.findIndex((s, k) => !used.has(k) && hit(s));
    // may_share: an assertion that can live in the same step as an earlier one.
    if (i < 0 && e.may_share) i = steps.findIndex(hit);
    if (i >= 0) used.add(i); else misses.push(`${types.join('|')} ${JSON.stringify(e.match ?? e.match_any)}`);
  }
  return { score: expected.length ? (expected.length - misses.length) / expected.length : 1, misses };
}

export function gradeRun(c, run) {
  const steps = stepsOf(run.spec.json);
  const cov = coverage(c.expected.steps, steps);
  const s = run.dd?.summary?.steps;
  const ran = s ? s.pass + s.fail + s.warning : 0;
  const passes = run.dd && run.dd.code === 0 && ran > 0 && s.fail === 0 ? 1 : 0;
  return {
    // complete: runs green AND has every step the page needs. A spec that only
    // opens the page passes but covers nothing, so neither half alone is the score.
    grade: {
      complete: passes && cov.score === 1 ? 1 : 0,
      verified_coverage: passes ? Number(cov.score.toFixed(3)) : 0,
      passes,
      coverage: Number(cov.score.toFixed(3)),
      spec_written: run.spec.json ? 1 : 0,
    },
    explanation: {
      complete: passes ? (cov.score === 1 ? 'passes with every expected step' : 'passes but misses expected steps') : 'does not pass',
      passes: !run.spec.path ? 'no spec file written'
        : !run.spec.json ? 'spec file is not valid JSON'
        : `doc-detective exit ${run.dd.code}; steps ${JSON.stringify(s ?? null)}`,
      coverage: cov.misses.length ? `missing: ${cov.misses.join('; ')}` : 'all expected steps present',
      spec_written: run.spec.path ? `${run.spec.at_requested_path ? 'at' : 'NOT at'} requested path` : 'none',
    },
  };
}
