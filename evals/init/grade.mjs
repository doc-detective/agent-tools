//
// Init eval. Each case is a small repo that doesn't use Doc Detective yet (or, in the
// `existing` cases, already does). Claude Code, with only this repo's plugin loaded, runs
// `/doc-detective-init` in a fresh copy. Nobody answers its questions, so it should offer
// CI, not write a workflow, unless the prompt asks for one.
//
// The grade is deterministic except `report`:
//   ran       the session ran Doc Detective (a shell call that executes it)
//   config    a config at the repo root parses, and a run that uses only it (no --input, as
//             the GitHub Action runs) passes Doc Detective's config validation and finds tests
//   tests     in that run, each procedure the case names has a test with the expected result
//             (PASS, or FAIL for a stale doc or a service that's down), no test comes from a
//             file the case excludes, and no other test fails
//   no_harm   doc prose unchanged; nothing added but a root config, spec files, a .gitignore,
//             and (when the prompt asks for CI) a workflow; no other file changed, except lines
//             added to .gitignore; in an `existing` case, nothing changed at all
//   ci        when the prompt asks for CI, a new workflow uses doc-detective/github-action;
//             otherwise nothing under .github/ changed
//   report    the final report names each must_mention string, and an LLM judge agrees it
//             meets the case's rubric, which ends with what it should say about CI
//   complete  all six
//
// The grade's run uses the session's config as it left it, with its input passed as
// --input from the repo root (where the config sits, so paths resolve the same), auto
// screenshots off, and doc-detective@5.6.3 (see evals/test/grade.mjs).

import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { stepActions } from 'doc-detective-common';
import { makeWorkspace as baseWorkspace, changes, prose, isDDRun, rerun, judge, checkDown, removeWorkspace } from '../test/grade.mjs';

const EVAL_DIR = dirname(fileURLToPath(import.meta.url));
const CASES = join(EVAL_DIR, 'cases');
export const KINDS = ['layout', 'exclude', 'env', 'stale', 'existing', 'ci'];
const CI = ['offer', 'asked', 'silent', 'any'];
export const CONFIGS = ['.doc-detective.json', '.doc-detective.yaml', '.doc-detective.yml'];
// The config a right session writes, per the skill, unless a case's reference/ has its own.
const REF_CONFIG = readFileSync(join(EVAL_DIR, 'reference.doc-detective.json'), 'utf8');
const CI_RUBRIC = {
  offer: 'It offers to add the Doc Detective GitHub Action workflow, or asks whether the user wants it, and doesn\'t say it wrote one.',
  asked: 'It says it added a GitHub Actions workflow that runs the Doc Detective tests.',
  silent: 'The repository isn\'t on GitHub, so it doesn\'t offer or mention the Doc Detective GitHub Action.',
  any: '',
};

// The repo can't hold a fixture's own `.gitignore` or `node_modules/`, so fixtures name them
// `_gitignore` and `_node_modules/`.
const unfixture = p => p.replace(/(^|\/)_gitignore$/, '$1.gitignore').replace(/(^|\/)_node_modules(?=\/)/g, '$1node_modules');
const walk = (root, d = root) => readdirSync(d, { withFileTypes: true }).flatMap(n =>
  n.isDirectory() ? walk(root, join(d, n.name)) : [relative(root, join(d, n.name)).replace(/\\/g, '/')]);
const readTree = dir => Object.fromEntries(walk(dir).map(p => [unfixture(p), readFileSync(join(dir, p), 'utf8')]));
const readOr = (p, v = null) => { try { return readFileSync(p, 'utf8'); } catch (e) { if (e?.code === 'ENOENT') return v; throw e; } };
const lower = s => String(s ?? '').toLowerCase();

export async function loadCases() {
  const cases = [];
  for (const id of readdirSync(CASES).sort()) {
    const cdir = join(CASES, id);
    const e = JSON.parse(readFileSync(join(cdir, 'expected.json'), 'utf8'));
    if (!KINDS.includes(e.kind)) throw new Error(`cases/${id}: kind must be one of ${KINDS.join(', ')}`);
    if (!CI.includes(e.ci)) throw new Error(`cases/${id}: ci must be one of ${CI.join(', ')}`);
    if (!e.procedures?.length) throw new Error(`cases/${id}: needs at least one procedure`);
    const files = readTree(join(cdir, 'workspace'));
    const refDir = join(cdir, 'reference');
    const reference = existsSync(refDir) ? readTree(refDir) : {};
    if (existsSync(refDir) && !CONFIGS.some(p => p in reference)) reference['.doc-detective.json'] = REF_CONFIG;
    if (e.existing && Object.keys(reference).length) throw new Error(`cases/${id}: an existing case changes nothing, so it has no reference/`);
    cases.push({
      id, cdir, kind: e.kind, expected: e, files, reference,
      referenceReport: readFileSync(join(cdir, 'reference.md'), 'utf8'),
      rubric: [e.report, CI_RUBRIC[e.ci]].filter(Boolean).join(' '),
      prompt: `/doc-detective:doc-detective-init${e.args ? ' ' + e.args : ''}`,
      tags: [e.kind, ...(e.procedures.some(p => [].concat(p.result ?? 'PASS').includes('FAIL')) ? ['fails'] : []), ...(e.exclude?.length ? ['exclude'] : [])],
    });
  }
  const only = process.env.EVAL_ONLY?.split(',').map(s => s.trim()).filter(Boolean);
  if (!only?.length) return cases;
  const unknown = only.filter(id => !cases.some(c => c.id === id));
  if (unknown.length) throw new Error(`EVAL_ONLY names no case ${unknown.join(', ')}`);
  return cases.filter(c => only.includes(c.id));
}

/**
 * A fresh one-commit repo holding the case's files, with a remote for `expected.remote`
 * (github by default), and `overlay` (path -> text, or null to delete) on top.
 */
export function makeWorkspace(c, overlay = {}) {
  const ws = baseWorkspace(c, Object.fromEntries(Object.entries(overlay).filter(([, v]) => v != null)));
  try {
    for (const [p, v] of Object.entries(overlay)) if (v == null) rmSync(join(ws, p), { force: true });
    const host = { github: 'github.com', gitlab: 'gitlab.com', none: null }[c.expected.remote ?? 'github'];
    if (host) execFileSync('git', ['remote', 'add', 'origin', `https://${host}/acme/${c.id}.git`], { cwd: ws, stdio: 'ignore' });
    return ws;
  } catch (e) { removeWorkspace(ws); throw e; }
}

// --- the session's config and the grade's run ------------------------------------

function readConfig(ws) {
  const path = CONFIGS.find(p => existsSync(join(ws, p)));
  if (!path) return { path: null };
  const text = readFileSync(join(ws, path), 'utf8');
  try {
    const object = path.endsWith('.json') ? JSON.parse(text) : YAML.parse(text);
    if (!object || typeof object !== 'object' || Array.isArray(object)) return { path, error: 'isn\'t an object' };
    return { path, object };
  } catch (err) { return { path, error: `doesn't parse: ${err.message.split('\n')[0]}` }; }
}

const actionsOnly = step => Object.fromEntries(Object.entries(step ?? {}).filter(([k]) => stepActions.includes(k)));

/**
 * Run the tests the config finds, the way a run without --input would, and list every
 * test with its result and its steps' actions (lowercased JSON, for matching).
 */
export async function runConfig(ws, config) {
  const { input = '.', ...rest } = config;
  const r = await rerun({ config: rest, target: [].concat(input).join(',') }, ws);
  const results = JSON.parse(readOr(join(ws, '.dd-grade', 'results.json'), 'null'));
  const tests = (results?.specs ?? []).flatMap(s => (s.tests ?? []).map(t => ({
    id: t.testId, spec: s.specId, result: t.result,
    text: lower(JSON.stringify((t.contexts ?? []).flatMap(ctx => (ctx.steps ?? []).map(actionsOnly)))),
  })));
  return { code: r.code, tests, failures: r.failures, log: r.log };
}

/** Everything the grade needs from a workspace once the session is done. */
export async function collect(c, ws, toolCalls, runFn = runConfig) {
  const changed = changes(c, ws);
  const files = Object.fromEntries([...new Set([...Object.keys(c.files), ...changed.map(x => x.path)])].map(p => [p, readOr(join(ws, p))]));
  const config = readConfig(ws);
  return {
    changed, files, config,
    dd_runs: toolCalls.filter(isDDRun).length,
    skills: toolCalls.filter(tc => tc?.name === 'Skill').map(tc => tc.input?.skill),
    run: config.object ? await runFn(ws, config.object) : null,
  };
}

// --- grade -----------------------------------------------------------------------

const isSpec = text => {
  try { const j = YAML.parse(text ?? ''); return Array.isArray(j?.tests); } catch { return false; }
};
const WORKFLOW = /^\.github\/workflows\/[^/]+\.ya?ml$/;
const usesAction = text => {
  try { return /doc-detective\/github-action@/.test(text) && !!YAML.parse(text)?.jobs; } catch { return false; }
};
const keepsLines = (before, after) => {
  const now = new Set(String(after ?? '').split(/\r?\n/));
  return String(before).split(/\r?\n/).every(l => now.has(l));
};

/**
 * facts: collect()'s result plus `report` (the session's final text). judgeFn defaults
 * to judge(); check-references passes a cached one.
 */
export async function gradeRun(c, facts, judgeFn = judge) {
  const e = c.expected;
  const report = facts.report ?? '';
  const tests = facts.run?.tests ?? [];

  const ran = facts.dd_runs > 0 ? 1 : 0;

  const cfg = facts.config;
  const configWhy = !cfg.path ? 'no config at the repo root'
    : cfg.error ? `${cfg.path} ${cfg.error}`
    : !tests.length ? `a run with only ${cfg.path} found no tests (exit ${facts.run?.code}; input ${JSON.stringify(cfg.object.input ?? '.')}): ${String(facts.run?.log ?? '').replace(/\s+/g, ' ').slice(-300)}`
    : null;
  const config = configWhy ? 0 : 1;

  const has = (t, match) => match.every(s => t.text.includes(lower(s)));
  const missing = [], wrongResult = [];
  for (const p of e.procedures) {
    const want = [].concat(p.result ?? 'PASS');
    const matched = tests.filter(t => has(t, p.match));
    if (!matched.length) missing.push(p.doc);
    for (const t of matched) if (!want.includes(t.result)) wrongResult.push(`${p.doc}: ${t.id} ${t.result}, want ${want.join(' or ')}`);
  }
  const excluded = (e.exclude ?? []).filter(x => tests.some(t => has(t, x.match))).map(x => x.doc);
  // A failing test is expected only when it touches a procedure that may fail (its first match string).
  const mayFail = e.procedures.filter(p => [].concat(p.result ?? 'PASS').includes('FAIL')).map(p => lower(p.match[0]));
  const stray = tests.filter(t => t.result === 'FAIL' && !mayFail.some(k => t.text.includes(k))).map(t => t.id);
  const testsOk = config && !missing.length && !wrongResult.length && !excluded.length && !stray.length ? 1 : 0;

  const harm = [];
  for (const x of facts.changed) {
    const p = x.path, now = facts.files[p];
    if (e.existing) harm.push(`${p} ${x.status}`);
    else if (x.status === 'added') {
      // The skill's config guidance says to gitignore `.doc-detective/`, so a new `.gitignore` is fine.
      if (!(CONFIGS.includes(p) || p === '.gitignore' || isSpec(now) || (e.ci === 'asked' && WORKFLOW.test(p)))) harm.push(`${p} added`);
    } else if (x.status === 'modified' && /\.mdx?$/i.test(p)) {
      if (prose(now) !== prose(c.files[p])) harm.push(`prose of ${p} edited`);
    } else if (!(x.status === 'modified' && p === '.gitignore' && keepsLines(c.files[p], now))) harm.push(`${p} ${x.status}`);
  }
  const no_harm = harm.length ? 0 : 1;

  const gh = facts.changed.filter(x => x.path.startsWith('.github/'));
  const workflows = gh.filter(x => x.status === 'added' && WORKFLOW.test(x.path) && usesAction(facts.files[x.path]));
  const ci = e.ci === 'asked' ? (workflows.length && gh.every(x => x.status === 'added') ? 1 : 0) : (gh.length ? 0 : 1);

  const missingWords = (e.must_mention ?? []).filter(m => ![].concat(m).some(n => lower(report).includes(lower(n))));
  const verdict = missingWords.length ? null : await judgeFn(c.rubric, report);
  const reportOk = !missingWords.length && verdict?.pass ? 1 : 0;

  const complete = ran && config && testsOk && no_harm && ci && reportOk ? 1 : 0;
  return {
    grade: { complete, ran, config, tests: testsOk, no_harm, ci, report: reportOk },
    explanation: {
      complete: complete ? 'set up, ran, and reported, with nothing harmed' : 'see the failing metrics',
      ran: `${facts.dd_runs} Doc Detective run(s) in the session; skills: ${facts.skills?.join(', ') || 'none'}`,
      config: configWhy ?? `${cfg.path}: ${tests.length} test(s) found`,
      tests: testsOk ? `every procedure tested as expected: ${tests.map(t => `${t.id} ${t.result}`).join(', ')}`
        : [!config && 'no config run', missing.length && `no test for ${missing.join(', ')}`, wrongResult.length && `wrong result: ${wrongResult.join('; ')}`,
           excluded.length && `tested excluded ${excluded.join(', ')}`, stray.length && `failing tests no procedure explains: ${stray.join(', ')}`].filter(Boolean).join('; '),
      no_harm: no_harm ? `changed: ${facts.changed.map(x => `${x.path} ${x.status}`).join(', ') || 'nothing'}` : harm.join('; '),
      ci: e.ci === 'asked' ? (ci ? `workflow added: ${workflows.map(x => x.path).join(', ')}` : `no new workflow using doc-detective/github-action${gh.some(x => x.status !== 'added') ? `; changed ${gh.filter(x => x.status !== 'added').map(x => x.path).join(', ')}` : ''}`)
        : ci ? 'nothing under .github/ changed' : `changed under .github/: ${gh.map(x => `${x.path} ${x.status}`).join(', ')}`,
      report: missingWords.length ? `report doesn't mention ${missingWords.map(m => JSON.stringify(m)).join(', ')}` : `judge ${verdict.pass ? 'PASS' : 'FAIL'}: ${verdict.reason}`,
      run: facts.run ? `exit ${facts.run.code}${facts.run.failures.length ? `; ${facts.run.failures.join(' | ')}` : ''}` : 'not run',
    },
    judge_model: verdict ? verdict.model : undefined,
    judge_usage: verdict?.usage,
    judge_cost_usd: verdict?.cost_usd,
  };
}

export { checkDown, removeWorkspace, judge };
