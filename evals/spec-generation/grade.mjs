//
// Spec-generation eval. Each case is one documentation page. Claude Code, with
// only this repo's plugin loaded, runs the generate skill on it in a fresh
// workspace. The grade runs the spec it wrote with Doc Detective and compares
// its steps to the steps a human checked the page needs.
//
// Three slices:
//   web      evals/spec-generation/cases/<id>/          docs for doc-detective's local
//            test server (pages on :8092, API on :8093)
//   manni    evals/spec-generation/cases-manni/<id>/    manni CLI docs with their inline
//            tests removed, in a small user repo holding what the page names
//   dd-docs  evals/spec-generation/cases-dd-docs/<id>/  Doc Detective's own docs with their
//            inline tests removed; run against the shell and the test servers
//
// A case's `workspace/` folder, when present, is the repo the session starts in.
// The page goes to `expected.doc_path` (web: docs/<id>.md). manni and dd-docs
// workspaces become a one-commit git repo, so the page's original tests are in
// no history the session can read.
//
// Environment (see evals/README.md):
//   DD_REPO        doc-detective checkout with `npm ci` done; its test servers are
//                  started here when :8092 isn't already up (web and dd-docs slices)
//   MANNI_PREFIX   npm prefix the manni CLI is linked into (`npm link` with npm_config_prefix);
//                  its bin dir goes first on PATH; the session's own prefix links the same
//                  package, so npx `@hawkeyexl/manni` resolves to it there too
//   DD_NODE_DIR    optional: a Node >= 22.22.2 / 24.15 directory put first on PATH
//                  for Doc Detective (its Appium refuses older Node)

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { tempWorkspace } from '../lib/claude-run.mjs';

const WIN = process.platform === 'win32';

const EVAL_DIR = dirname(fileURLToPath(import.meta.url));
// What `doc-detective@5` resolves to, so the session's own runs and the grade agree.
export const DD_VERSION = '5.6.0';
const SEP = WIN ? ';' : ':';
const SLICES = [['web', 'cases'], ['manni', 'cases-manni'], ['dd-docs', 'cases-dd-docs']];
export const usesServers = c => c.slice !== 'manni';

/**
 * The model session's environment: the same tools on PATH, but its own npm prefix in
 * the workspace. A page that tells the reader to `npm install -g` then installs into
 * the workspace, not into the pinned prefix the grade runs against.
 *
 * `npx` looks for a package in the global prefix, not on PATH, so the session's
 * prefix links the pinned manni package and copies its bin shims. The session's
 * `npx @hawkeyexl/manni` then runs the build the grade checks, not the registry's latest.
 */
export function sessionEnv(ws, base = process.env) {
  const env = toolEnv(base);
  const prefix = join(ws, '.npm-global');
  mkdirSync(prefix, { recursive: true });
  const pinned = base.MANNI_PREFIX;
  if (pinned) {
    const mods = WIN ? 'node_modules' : join('lib', 'node_modules');
    const bin = WIN ? '' : 'bin';
    const pkg = join(pinned, mods, '@hawkeyexl', 'manni');
    mkdirSync(join(prefix, mods, '@hawkeyexl'), { recursive: true });
    mkdirSync(join(prefix, bin), { recursive: true });
    let target;
    try { target = realpathSync(pkg); }
    catch { throw Object.assign(new Error(`no manni package at ${pkg}: run \`npm link\` with npm_config_prefix set to MANNI_PREFIX`), { failure_class: 'harness' }); }
    symlinkSync(target, join(prefix, mods, '@hawkeyexl', 'manni'), 'junction');
    for (const f of readdirSync(join(pinned, bin))) {
      if (/^(manni|docmeta)(\.cmd|\.ps1)?$/.test(f)) cpSync(join(pinned, bin, f), join(prefix, bin, f), { verbatimSymlinks: true });
    }
  }
  return { ...env, npm_config_prefix: prefix };
}

/** Fail the case as a harness error if the pinned manni CLI is no longer the expected version. */
export function checkToolchain() {
  const want = process.env.MANNI_VERSION;
  if (!want) return;
  let got = '';
  try {
    got = execFileSync(WIN ? 'manni.cmd' : 'manni', ['--version'], { env: toolEnv(), shell: WIN, encoding: 'utf8' }).trim();
  } catch (e) { got = `unavailable (${String(e.message).split(/\r?\n/)[0]})`; }
  // Exact match on the version token, so 2.6.0-rc.1 doesn't pass for 2.6.0.
  if (!got.split(/\s+/).map(t => t.replace(/^v/, '')).includes(want))
    throw Object.assign(new Error(`pinned manni is ${got}, expected ${want}: something changed MANNI_PREFIX`), { failure_class: 'harness' });
}

/** PATH and npm prefix that put DD_NODE_DIR and the linked manni CLI first, for the grade's own runs. */
export function toolEnv(base = process.env) {
  const prefix = base.MANNI_PREFIX;
  const extra = [prefix && (WIN ? prefix : join(prefix, 'bin')), base.DD_NODE_DIR];
  const path = [...extra, base.PATH ?? base.Path].filter(Boolean).join(SEP);
  return { ...base, PATH: path, Path: path, ...(prefix ? { npm_config_prefix: prefix } : {}) };
}

export async function loadCases() {
  const cases = [];
  for (const [slice, dir] of SLICES) {
    for (const id of readdirSync(join(EVAL_DIR, dir)).sort()) {
      const cdir = join(EVAL_DIR, dir, id);
      if (!statSync(cdir).isDirectory()) continue;
      const expected = JSON.parse(readFileSync(join(cdir, 'expected.json'), 'utf8'));
      const docFile = ['doc.md', 'doc.mdx'].find(f => existsSync(join(cdir, f)));
      const docPath = slice === 'web' ? `docs/${id}.md` : expected.doc_path;
      if (!docFile || !docPath) throw new Error(`${dir}/${id}: needs doc.md or doc.mdx, and doc_path in expected.json`);
      const steps = expected.steps.length;
      cases.push({
        id: `${slice}-${id}`, name: id, slice, cdir, docFile, docPath, expected,
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
  const repo = join(c.cdir, 'workspace');
  if (existsSync(repo)) cpSync(repo, ws, { recursive: true });
  // Stored as _gitignore so it doesn't apply to this repo.
  for (const f of readdirSync(ws, { recursive: true })) if (basename(f) === '_gitignore') renameSync(join(ws, f), join(ws, dirname(f), '.gitignore'));
  mkdirSync(join(ws, dirname(c.docPath)), { recursive: true });
  cpSync(join(c.cdir, c.docFile), join(ws, c.docPath));
  // An empty tests/ reads as missing; the placeholder keeps it visible.
  mkdirSync(join(ws, 'tests'), { recursive: true });
  writeFileSync(join(ws, 'tests', '.gitkeep'), '');
  if (c.slice !== 'web') {
    const git = (...a) => execFileSync('git', ['-c', 'user.name=eval', '-c', 'user.email=eval@example.invalid', '-c', 'core.autocrlf=false', ...a], { cwd: ws, stdio: 'ignore' });
    git('init', '-q'); git('add', '-A'); git('commit', '-qm', 'eval workspace');
  }
  return ws;
}

// --- test servers (web and dd-docs slices) ----------------------------------

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
  const want = join(ws, 'tests', `${c.name}.spec.json`);
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

/**
 * The workspace's `.doc-detective.json`, as the session left it, with the eval's
 * config on top. A session may register an OpenAPI description or set variables
 * there, as a user would; the eval's keys (headless Chrome, no telemetry) always win.
 * Relative paths resolve the default way, against the spec file, unless the session's
 * own config says otherwise. An unreadable workspace config is ignored.
 */
export function gradeConfig(ws) {
  let own = {};
  try { own = JSON.parse(readFileSync(join(ws, '.doc-detective.json'), 'utf8')); } catch {}
  if (!own || typeof own !== 'object' || Array.isArray(own)) own = {};
  return { ...own, ...JSON.parse(readFileSync(join(EVAL_DIR, 'doc-detective.config.json'), 'utf8')) };
}

export function runDocDetective(c, ws, specPath) {
  const out = join(ws, '.dd-out');
  mkdirSync(out, { recursive: true });
  // Beside the session's own config, so relative paths in it resolve as they would there.
  const config = join(ws, '.dd-grade-config.json');
  writeFileSync(config, JSON.stringify(gradeConfig(ws)));
  const args = ['-y', `doc-detective@${DD_VERSION}`, '-i', specPath, '-c', config,
                '-o', join(out, 'results.json'), '--output-dir', out,
                '--no-auto-update', '--no-telemetry', '--no-hints', '--no-input'];
  return new Promise(resolvePromise => {
    const child = spawn(WIN ? 'npx.cmd' : 'npx', args, { cwd: ws, env: toolEnv(), shell: WIN, stdio: ['ignore', 'pipe', 'pipe'] });
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
      let results = null;
      try { results = JSON.parse(readFileSync(join(out, 'results.json'), 'utf8')); } catch {}
      resolvePromise({ code, summary: results?.summary ?? null, failures: failedSteps(results), log: log.slice(-4000) });
    });
  });
}

/** The first five failing steps in a results file, as `<testId> <stepId> <action>: <resultDescription>`. */
export function failedSteps(results) {
  const out = [];
  const list = x => (Array.isArray(x) ? x : []);
  for (const spec of list(results?.specs)) for (const t of list(spec?.tests)) for (const ctx of list(t?.contexts)) {
    for (const st of list(ctx?.steps)) {
      if (st?.result === 'FAIL') out.push(`${t.testId} ${st.stepId} ${actionOf(st)}: ${String(st.resultDescription).replace(/\s+/g, ' ')}`.slice(0, 300));
    }
  }
  return out.slice(0, 5);
}

// --- grade ------------------------------------------------------------------

const NON_ACTION_KEYS = new Set(['stepId', 'description', 'unsafe', 'outputs', 'variables', 'breakpoint', 'location', '$schema']);
const actionOf = step => Object.keys(step ?? {}).find(k => !NON_ACTION_KEYS.has(k));
const norm = s => String(s).replace(/\\/g, '').toLowerCase();

export function stepsOf(spec) {
  const tests = Array.isArray(spec?.tests) ? spec.tests : [];
  return tests.flatMap(t => Array.isArray(t?.steps) ? t.steps : []);
}

/**
 * The text a step is matched against: its action's payload and the `variables` it
 * captures, so a step's `description` can't satisfy a match. JSON escapes for line
 * breaks become spaces. With `args`, the command line `command arg1 arg2` is added too.
 */
function stepText(s) {
  const p = s?.[actionOf(s)];
  const json = JSON.stringify([p ?? null, s?.variables ?? null]).replace(/\\(.)/g, (_, c) => 'nrt'.includes(c) ? ' ' : c === '\\' ? '' : c).toLowerCase();
  const line = Array.isArray(p?.args) ? norm([p.command ?? '', ...p.args].join(' ')) : '';
  return `${json}\n${line}`;
}

// A token starting with `-` is a flag: it matches only as a whole token, so `-s` misses `-spec-tmp`.
const WORD = /[a-z0-9_-]/;
function has(text, m) {
  // Plain terms match as substrings (a URL, a quoted output line); flags match as whole tokens.
  if (!m.startsWith('-')) return text.includes(m);
  const closed = WORD.test(m.at(-1));
  for (let i = text.indexOf(m); i >= 0; i = text.indexOf(m, i + 1)) {
    if (!WORD.test(text[i - 1] ?? ' ') && (!closed || !WORD.test(text[i + m.length] ?? ' '))) return true;
  }
  return false;
}

/**
 * `fields` maps a dotted path inside the action's value, such as `request.body.role`, to a
 * case-insensitive regex the value there must match. A string is tested as is, anything else
 * as JSON, and a missing path fails.
 */
function fieldsMatch(fields, payload) {
  return Object.entries(fields ?? {}).every(([path, re]) => {
    const v = path.split('.').reduce((o, k) => (o != null && typeof o === 'object' ? o[k] : undefined), payload);
    return v !== undefined && new RegExp(re, 'i').test(typeof v === 'string' ? v : JSON.stringify(v));
  });
}

/**
 * Maximum one-to-one matching between expected entries and generated steps.
 * An entry with `may_share` can live in a step another entry already claims,
 * so it only needs some step that matches.
 */
export function coverage(expected, steps) {
  const texts = steps.map(stepText);
  const hits = expected.map(e => {
    const types = [].concat(e.stepType ?? e.action);
    const all = [].concat(e.match ?? []).map(norm);
    const any = [].concat(e.match_any ?? []).map(norm);
    return steps.flatMap((s, k) => types.includes(actionOf(s)) && all.every(m => has(texts[k], m)) && (!any.length || any.some(m => has(texts[k], m))) && fieldsMatch(e.fields, s?.[actionOf(s)]) ? [k] : []);
  });
  // Kuhn's augmenting paths, in document order, so earlier entries keep their claim.
  const owner = new Map();
  const augment = (j, seen) => hits[j].some(k => {
    if (seen.has(k)) return false;
    seen.add(k);
    if (!owner.has(k) || augment(owner.get(k), seen)) { owner.set(k, j); return true; }
    return false;
  });
  const misses = [];
  expected.forEach((e, j) => {
    const ok = e.may_share ? hits[j].length > 0 : augment(j, new Set());
    if (!ok) misses.push(`${[].concat(e.stepType ?? e.action).join('|')} ${JSON.stringify(e.match ?? e.match_any)}`);
  });
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
        : `doc-detective exit ${run.dd.code}; steps ${JSON.stringify(s ?? null)}${run.dd.failures?.length ? `; failed: ${run.dd.failures.join(' | ')}` : ''}`,
      coverage: cov.misses.length ? `missing: ${cov.misses.join('; ')}` : 'all expected steps present',
      spec_written: run.spec.path ? `${run.spec.at_requested_path ? 'at' : 'NOT at'} requested path` : 'none',
    },
  };
}
