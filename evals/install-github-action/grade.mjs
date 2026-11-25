//
// Install-github-action eval. Each case is a small docs repo, one git commit with an
// `origin` remote (GitHub unless the case says otherwise), and a request to
// `/doc-detective-install-github-action`. The session doesn't run Doc Detective; the grade
// reads the files it leaves and its final report, and is deterministic except `report`:
//   workflow   one new workflow under .github/workflows/ (none when the case says not to
//              write; on a `proposal` case, the YAML block in the report instead). It parses,
//              is a valid workflow, and its doc-detective/github-action step sets only inputs
//              action.yml has (action-inputs.json), none deprecated, each a scalar of the
//              right shape. actionlint also runs when it's on PATH or ACTIONLINT names it.
//   fit        the workflow does what the case asks for this repo (expected.json `fit`)
//   no_harm    no existing file changed; nothing added outside .github/workflows/
//   report     the report has every must_mention string, and the judge (claude-haiku-4-5)
//              says it meets the case's `report` rubric
//   complete   all four

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { parseDocument } from 'yaml';
import { makeWorkspace as commitWorkspace } from '../test/grade.mjs';
import { removeWorkspace } from '../lib/claude-run.mjs';
import { judge as baseJudge, JUDGE_MODEL } from '../lib/judge.mjs';

const EVAL_DIR = dirname(fileURLToPath(import.meta.url));
const CASES = join(EVAL_DIR, 'cases');
export const ACTION = JSON.parse(readFileSync(join(EVAL_DIR, 'action-inputs.json'), 'utf8'));
export const KINDS = ['basic', 'config', 'setup', 'trigger', 'filter', 'existing', 'feature', 'decline', 'route', 'confirm'];
const DEFAULT_REMOTE = 'https://github.com/acme-docs/widget-docs.git';
export { JUDGE_MODEL };

const nl = t => t.replace(/\r\n/g, '\n').replace(/\s+$/, '');
const walk = (root, skip = () => false, d = root) => readdirSync(d, { withFileTypes: true }).flatMap(n => {
  const p = join(d, n.name), rel = relative(root, p).replace(/\\/g, '/');
  if (skip(rel, n)) return [];
  return n.isDirectory() ? walk(root, skip, p) : [rel];
});
const readTree = root => Object.fromEntries(walk(root).map(p => [p, readFileSync(join(root, p), 'utf8')]));
// Only a missing file reads as `v`; any other failure is a real error, not a deletion.
const readOr = (p, v = null) => { try { return readFileSync(p, 'utf8'); } catch (e) { if (e?.code === 'ENOENT') return v; throw e; } };

export function loadCases() {
  const cases = [];
  for (const id of readdirSync(CASES).sort()) {
    const cdir = join(CASES, id);
    const e = JSON.parse(readFileSync(join(cdir, 'expected.json'), 'utf8'));
    if (!KINDS.includes(e.kind)) throw new Error(`cases/${id}: kind must be one of ${KINDS.join(', ')}`);
    if (![true, false, 'optional'].includes(e.write)) throw new Error(`cases/${id}: write must be true, false, or "optional"`);
    e.fit = { permissions: [{ contents: 'read' }], ...e.fit };
    cases.push({
      id, cdir, kind: e.kind, expected: e,
      files: readTree(join(cdir, 'workspace')),
      reference: existsSync(join(cdir, 'reference')) ? readTree(join(cdir, 'reference')) : {},
      referenceReport: readFileSync(join(cdir, 'reference.md'), 'utf8'),
      prompt: `/doc-detective:doc-detective-install-github-action${e.args ? ` ${e.args}` : ''}`,
      tags: [e.kind],
    });
  }
  const only = process.env.EVAL_ONLY?.split(',').map(s => s.trim()).filter(Boolean);
  if (!only?.length) return cases;
  const unknown = only.filter(id => !cases.some(c => c.id === id));
  if (unknown.length) throw new Error(`EVAL_ONLY names no case ${unknown.join(', ')}`);
  return cases.filter(c => only.includes(c.id));
}

/** The test eval's one-commit workspace, on the case's branch (default `main`), with its `origin` remote. */
export function makeWorkspace(c, overlay = {}) {
  const ws = commitWorkspace(c, overlay);
  try {
    const git = (...a) => execFileSync('git', a, { cwd: ws, stdio: 'ignore' });
    git('branch', '-M', c.expected.branch ?? 'main');
    if (c.expected.remote !== null) git('remote', 'add', 'origin', c.expected.remote ?? DEFAULT_REMOTE);
    return ws;
  } catch (e) { removeWorkspace(ws); throw e; }
}

// A session that runs Doc Detective anyway leaves run files; they aren't the session's edits.
const SKIP_DIRS = new Set(['.git', 'node_modules', '.npm-global', '.doc-detective']);

/** Files the session modified, deleted, or added as { path, status }, and every file's text afterwards. */
export function collect(c, ws) {
  const changed = [];
  for (const [p, text] of Object.entries(c.files)) {
    const now = readOr(join(ws, p));
    if (now == null) changed.push({ path: p, status: 'deleted' });
    else if (nl(now) !== nl(text)) changed.push({ path: p, status: 'modified' });
  }
  for (const p of walk(ws, (rel, n) => n.isDirectory() && SKIP_DIRS.has(n.name)))
    if (!(p in c.files)) changed.push({ path: p, status: 'added' });
  const files = { ...c.files };
  for (const x of changed) {
    if (x.status === 'deleted') delete files[x.path];
    else files[x.path] = readOr(join(ws, x.path), '');
  }
  return { changed, files };
}

// --- workflow checks -------------------------------------------------------------

const WF = /^\.github\/workflows\/[^/]+\.ya?ml$/;
const ACTION_USES = /^doc-detective\/github-action(?:@|$)/;
const PINNED = /^(?:v2(?:\.\d+){0,2}|[0-9a-f]{40})$/;
const NODE = /^(?:24|26)(?:\.(?:\d+|x))*$|^lts\/krypton$/;
const EVENTS = new Set(['branch_protection_rule', 'check_run', 'check_suite', 'create', 'delete', 'deployment', 'deployment_status',
  'discussion', 'discussion_comment', 'fork', 'gollum', 'issue_comment', 'issues', 'label', 'merge_group', 'milestone', 'page_build',
  'public', 'pull_request', 'pull_request_review', 'pull_request_review_comment', 'pull_request_target', 'push', 'registry_package',
  'release', 'repository_dispatch', 'schedule', 'status', 'watch', 'workflow_call', 'workflow_dispatch', 'workflow_run']);
const SCOPES = new Set(['actions', 'attestations', 'checks', 'contents', 'deployments', 'discussions', 'id-token', 'issues', 'models',
  'packages', 'pages', 'pull-requests', 'repository-projects', 'security-events', 'statuses']);
const BOOL_INPUTS = new Set(['cache', 'create_pr_on_change', 'exit_on_fail', 'create_issue_on_fail']);
const MENTIONS = new Set(['doc-sentinel', 'promptless', 'dosu', 'claude', 'opencode', 'copilot', 'cursor']);
const CRON_FIELDS = ['minute', 'hour', 'dom', 'month', 'dow'];
const isExpr = v => typeof v === 'string' && /^\$\{\{[\s\S]*\}\}$/.test(v.trim());
const str = v => String(v ?? '').trim();

/** A path in a workflow, as a repo-relative POSIX path: `./docs/` -> `docs`, `` -> `.`. */
export const norm = p => posix.normalize(String(p ?? '').replace(/\\/g, '/') || '.').replace(/^\.\//, '').replace(/\/+$/, '') || '.';

/** `on:` as { event: config }, from a string, a list, or a mapping; null when it's none of those. */
export function triggers(on) {
  if (typeof on === 'string') return { [on]: null };
  if (Array.isArray(on)) return Object.fromEntries(on.map(ev => [String(ev), null]));
  return on && typeof on === 'object' ? on : null;
}

/** A GitHub filter pattern (`paths`, `branches`) as a regex: `*` stops at `/`, `**` doesn't. */
export function globRe(g) {
  let re = '';
  for (let i = 0; i < g.length; i++) {
    if (g[i] !== '*') { re += g[i] === '?' ? '[^/]' : g[i].replace(/[.+^${}()|[\]\\]/g, '\\$&'); continue; }
    if (g[i + 1] !== '*') { re += '[^/]*'; continue; }
    i++;
    if (g[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
  }
  return new RegExp(`^${re}$`);
}
/** Whether a push or pull_request trigger with this config runs for a change to `file`. Later patterns win; `!` negates. */
export function runsFor(cfg, file) {
  if (cfg?.paths) {
    let hit = false;
    for (const g of [].concat(cfg.paths).map(String)) if (globRe(g.replace(/^!/, '')).test(file)) hit = !g.startsWith('!');
    return hit;
  }
  if (cfg?.['paths-ignore']) return ![].concat(cfg['paths-ignore']).some(g => globRe(String(g)).test(file));
  return true;
}

/** The steps that use doc-detective/github-action, with their job and index. */
export function actionSteps(doc) {
  return Object.entries(doc?.jobs ?? {}).flatMap(([name, job]) => (Array.isArray(job?.steps) ? job.steps : [])
    .map((step, idx) => ({ name, job, idx, step })).filter(x => ACTION_USES.test(str(x.step?.uses))));
}

/** The YAML block in a report that uses the action, or null. */
export function proposedWorkflow(report) {
  return [...String(report).matchAll(/```ya?ml[^\n]*\n([\s\S]*?)```/g)].map(m => m[1]).find(b => /doc-detective\/github-action/.test(b)) ?? null;
}

function which(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' });
  return r.status === 0 ? cmd : null;
}
const ACTIONLINT = process.env.ACTIONLINT || which('actionlint');
/** actionlint on the text, when it's available: { ok, out }, or null. */
export function actionlint(text) {
  if (!ACTIONLINT) return null;
  const dir = mkdtempSync(join(tmpdir(), 'dd-eval-lint-'));
  try {
    const f = join(dir, 'workflow.yml');
    writeFileSync(f, text);
    const r = spawnSync(ACTIONLINT, ['-no-color', '-shellcheck=', '-pyflakes=', f], { encoding: 'utf8' });
    if (r.error) return null;
    return { ok: r.status === 0, out: `${r.stdout}${r.stderr}`.replaceAll(f, 'workflow.yml').trim().split('\n').slice(0, 3).join(' | ') };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function checkInputs(w, problems) {
  if (w == null) return;
  if (typeof w !== 'object' || Array.isArray(w)) { problems.push('the action step\'s `with` isn\'t a mapping'); return; }
  for (const [k, v] of Object.entries(w)) {
    const spec = ACTION.inputs[k];
    if (!spec) { problems.push(`\`${k}\` isn't an input of doc-detective/github-action`); continue; }
    if (spec.deprecated) problems.push(`\`${k}\` is deprecated (${spec.deprecated})`);
    if (v !== null && typeof v === 'object') { problems.push(`\`${k}\` must be a string, not a YAML ${Array.isArray(v) ? 'list' : 'mapping'}`); continue; }
    if (isExpr(v)) continue;
    const s = str(v);
    if (BOOL_INPUTS.has(k) && !/^(?:true|false)$/.test(s)) problems.push(`\`${k}\` must be true or false, got ${JSON.stringify(v)}`);
    if (k === 'android' && !/^(?:auto|true|false)$/.test(s)) problems.push(`\`android\` must be auto, true, or false, got ${JSON.stringify(v)}`);
    if (k === 'issue_mentions') {
      const bad = s.split(',').map(x => x.trim()).filter(x => x && !MENTIONS.has(x));
      if (bad.length) problems.push(`\`issue_mentions\` has unsupported ${bad.join(', ')}`);
    }
    if (k === 'version' && !/^[\w.^~<>=*| -]*$/.test(s)) problems.push(`\`version\` ${JSON.stringify(v)} isn't a version, range, or tag`);
  }
}

function checkPermissions(perms, where, problems) {
  if (perms == null) return;
  if (typeof perms === 'string') { if (!['read-all', 'write-all'].includes(perms)) problems.push(`${where} permissions ${JSON.stringify(perms)} isn't valid`); return; }
  if (typeof perms !== 'object' || Array.isArray(perms)) { problems.push(`${where} permissions isn't a mapping`); return; }
  for (const [k, v] of Object.entries(perms)) {
    if (!SCOPES.has(k)) problems.push(`${where} permission \`${k}\` isn't a GitHub token scope`);
    else if (!['read', 'write', 'none'].includes(v)) problems.push(`${where} permission \`${k}: ${v}\` must be read, write, or none`);
  }
}

/** Is `text` a valid workflow that uses the action correctly? { doc, problems }. */
export function checkWorkflow(text, lint = actionlint) {
  const parsed = parseDocument(text);
  if (parsed.errors.length) return { doc: null, problems: [`the YAML doesn't parse: ${parsed.errors[0].message.split('\n')[0]}`] };
  const doc = parsed.toJS();
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { doc: null, problems: ['the workflow isn\'t a YAML mapping'] };
  const problems = [];
  const on = triggers(doc.on);
  if (!on || !Object.keys(on).length) problems.push('no `on` triggers');
  for (const ev of Object.keys(on ?? {})) if (!EVENTS.has(ev)) problems.push(`\`${ev}\` isn't a GitHub Actions event`);
  if (on && 'schedule' in on) {
    const s = on.schedule;
    if (!Array.isArray(s) || !s.length || s.some(x => str(x?.cron).split(/\s+/).length !== 5))
      problems.push('`schedule` must be a list of `cron` entries with five fields');
  }
  const jobs = doc.jobs && typeof doc.jobs === 'object' ? doc.jobs : null;
  if (!jobs || !Object.keys(jobs).length) problems.push('no jobs');
  for (const [name, job] of Object.entries(jobs ?? {})) {
    if (job?.uses) continue;
    if (!job?.['runs-on']) problems.push(`job \`${name}\` has no \`runs-on\``);
    if (!Array.isArray(job?.steps) || !job.steps.length) { problems.push(`job \`${name}\` has no steps`); continue; }
    job.steps.forEach((s, i) => { if (!s || (s.uses == null) === (s.run == null)) problems.push(`job \`${name}\` step ${i + 1} needs exactly one of \`uses\` and \`run\``); });
  }
  checkPermissions(doc.permissions, 'workflow', problems);
  for (const [name, job] of Object.entries(jobs ?? {})) checkPermissions(job?.permissions, `job \`${name}\``, problems);
  const steps = actionSteps(doc);
  if (!steps.length) problems.push('no step uses doc-detective/github-action');
  for (const { step } of steps) checkInputs(step.with, problems);
  if (!problems.length && lint) {
    const r = lint(text);
    if (r && !r.ok) problems.push(`actionlint: ${r.out}`);
  }
  return { doc, problems };
}

const sameMap = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.entries(b).every(([k, v]) => a[k] === v);
function sameValue(got, want) {
  if (got == null) return false;
  if (Array.isArray(want)) {
    const g = str(got).split(',').map(x => x.trim()).filter(Boolean).sort();
    return JSON.stringify(g) === JSON.stringify([...want].sort());
  }
  if (isExpr(want)) return str(got).replace(/\s+/g, '') === want.replace(/\s+/g, '');
  return str(got) === String(want);
}
const configInput = text => {
  const d = text == null ? null : parseDocument(text).toJS();
  return d?.input == null ? null : [].concat(d.input).map(String);
};

/** What the workflow does against what the case asks (expected.json `fit`), given the repo's files. */
export function checkFit(doc, c, files) {
  const f = c.expected.fit ?? {};
  const p = [];
  const [hit] = actionSteps(doc);
  if (!hit) return ['no step uses doc-detective/github-action'];
  const { job, idx, step } = hit;
  const ref = str(step.uses).split('@')[1];
  if (!PINNED.test(ref ?? '')) p.push(`the action's ref \`${ref ?? '(none)'}\` isn't pinned to v2 or a commit`);
  const before = job.steps.slice(0, idx), after = job.steps.slice(idx + 1);
  if (!before.some(s => /^actions\/checkout@/.test(str(s?.uses)))) p.push('no actions/checkout step before the action');
  const node = before.find(s => /^actions\/setup-node@/.test(str(s?.uses)));
  if (!node) p.push('no actions/setup-node step before the action');
  else if (!NODE.test(str(node.with?.['node-version']))) p.push(`setup-node sets ${JSON.stringify(node.with?.['node-version'] ?? node.with?.['node-version-file'] ?? null)}, not Node.js 24`);
  if (f.runs_on && !new RegExp(f.runs_on).test(str(job['runs-on']))) p.push(`runs on ${JSON.stringify(job['runs-on'])}, want ${f.runs_on}`);

  const on = triggers(doc.on) ?? {};
  for (const [ev, want] of Object.entries(f.triggers ?? {})) {
    if (!(ev in on)) { p.push(`no \`${ev}\` trigger`); continue; }
    const cfg = on[ev] ?? {};
    if (want?.branches) {
      const br = [].concat(cfg.branches ?? []).map(String);
      for (const b of want.branches) if (!br.some(g => globRe(g).test(b))) p.push(`\`${ev}\` doesn't run for branch \`${b}\``);
      for (const g of br) if (!want.branches.some(b => globRe(g).test(b))) p.push(`\`${ev}\` also runs for branches \`${g}\``);
    }
    if (ev === 'schedule') {
      const crons = [].concat(cfg ?? []).map(x => str(x?.cron).split(/\s+/));
      if (!crons.some(fields => Object.entries(want ?? {}).every(([k, v]) => fields[CRON_FIELDS.indexOf(k)] === v)))
        p.push(`no schedule matches ${JSON.stringify(want)}: ${crons.map(x => x.join(' ')).join('; ')}`);
    }
  }
  const allowed = new Set(['workflow_dispatch', ...Object.keys(f.triggers ?? {}), ...(f.allow_triggers ?? [])]);
  const extra = Object.keys(on).filter(ev => !allowed.has(ev));
  if (extra.length) p.push(`triggers the case didn't ask for: ${extra.join(', ')}`);
  if (f.paths) for (const ev of ['pull_request', 'push']) if (ev in on) {
    for (const file of f.paths.match ?? []) if (!runsFor(on[ev], file)) p.push(`\`${ev}\` doesn't run when ${file} changes`);
    for (const file of f.paths.skip ?? []) if (runsFor(on[ev], file)) p.push(`\`${ev}\` runs when ${file} changes`);
  }

  const w = step.with && typeof step.with === 'object' ? step.with : {};
  const exists = x => x === '.' || x in files || Object.keys(files).some(k => k.startsWith(`${x}/`));
  const wd = norm(w.working_directory);
  if (!exists(wd)) p.push(`\`working_directory\` ${wd} doesn't exist`);
  let config;
  if (str(w.config)) {
    config = norm(posix.join(wd, str(w.config)));
    if (!(config in files)) p.push(`\`config\` resolves to ${config}, which doesn't exist`);
  } else config = ['.doc-detective.json', '.doc-detective.yaml', '.doc-detective.yml'].map(n => norm(posix.join(wd, n))).find(x => x in files) ?? null;
  if ('config' in f && config !== f.config) p.push(`the config is ${config ?? 'none'}, want ${f.config ?? 'none'}`);
  let input;
  if (str(w.input)) {
    input = norm(posix.join(wd, str(w.input)));
    if (!exists(input)) p.push(`\`input\` resolves to ${input}, which doesn't exist`);
  } else input = (config && configInput(files[config]))?.map(x => norm(posix.join(wd, x))).join(',') ?? wd;
  if (f.input && !f.input.includes(input)) p.push(`tests ${input}, want ${f.input.join(' or ')}`);

  const perms = job.permissions ?? doc.permissions;
  if (f.permissions && !(perms && typeof perms === 'object' && f.permissions.some(want => sameMap(perms, want))))
    p.push(`permissions ${JSON.stringify(perms ?? 'unset')}, want ${f.permissions.map(x => JSON.stringify(x)).join(' or ')}`);
  for (const [k, want] of Object.entries(f.with ?? {})) if (!sameValue(w[k], want)) p.push(`\`${k}\` is ${JSON.stringify(w[k] ?? null)}, want ${JSON.stringify(want)}`);
  for (const k of f.without ?? []) if (k in w) p.push(`sets \`${k}\``);
  for (const alts of f.steps_before ?? [])
    if (!before.some(s => alts.some(re => new RegExp(re, 'm').test(str(s?.run ?? s?.uses))))) p.push(`no step before the action matches ${alts.join(' or ')}`);
  for (const [k, secret] of Object.entries(f.env ?? {})) {
    const v = [step.env, job.env, doc.env].map(e => e?.[k]).find(x => x != null);
    if (v == null) p.push(`\`${k}\` isn't in the action step's environment`);
    else if (!new RegExp(`secrets\\.${secret}\\b`).test(String(v))) p.push(`\`${k}\` doesn't come from \`secrets.${secret}\``);
  }
  if (f.artifact) {
    const up = after.find(s => /^actions\/upload-artifact@v(?:[4-9]|\d{2})/.test(str(s?.uses)));
    if (!up) p.push('no actions/upload-artifact@v4 step after the action');
    else {
      if (str(up.with?.['include-hidden-files']) !== 'true') p.push('upload-artifact without `include-hidden-files: true` skips `.doc-detective/`');
      const paths = str(up.with?.path).split('\n').map(x => x.trim()).filter(Boolean).map(norm);
      if (!paths.some(x => f.artifact.path.includes(x))) p.push(`uploads ${paths.join(', ') || 'nothing'}, want ${f.artifact.path.join(' or ')}`);
      if (!/always\(\)|!\s*cancelled\(\)|failure\(\)/.test(str(up.if))) p.push('upload-artifact is skipped when a test fails (no `if: always()`)');
    }
  }
  return p;
}

// --- grade -----------------------------------------------------------------------

const JUDGE_SYSTEM = 'You grade an assistant\'s final report to a user who asked it to set up Doc Detective documentation tests in GitHub Actions. You get a rubric and the report. Decide whether the report meets the rubric. Judge what the report claims and tells the user, not its style or length. A report may say more than the rubric asks; it fails only when it misses what the rubric requires or contradicts it. Reply with only a JSON object: {"verdict": "PASS" or "FAIL", "reason": "<one sentence>"}.';
export const judge = (rubric, report) => baseJudge(rubric, report, JUDGE_SYSTEM);

const lower = s => String(s ?? '').toLowerCase();
const hasAny = (hay, needle) => [].concat(needle).some(n => hay.includes(lower(n)));

/** facts: collect()'s result plus `report`, the session's final text. judgeFn defaults to judge(). */
export async function gradeRun(c, facts, judgeFn = judge) {
  const e = c.expected, report = facts.report ?? '';
  const added = facts.changed.filter(x => x.status === 'added');
  const newWf = added.map(x => x.path).filter(p => WF.test(p));

  const wfProblems = [];
  let text = null, where = null;
  if (e.write === false) {
    if (newWf.length) wfProblems.push(`added ${newWf.join(', ')}; the case wants nothing written`);
    if (e.proposal) {
      text = proposedWorkflow(report);
      where = 'the report\'s workflow';
      if (text == null) wfProblems.push('the report shows no workflow YAML that uses doc-detective/github-action');
    }
  } else if (newWf.length === 1) { text = facts.files[newWf[0]]; where = newWf[0]; }
  else if (newWf.length > 1 || e.write === true) wfProblems.push(`${newWf.length} new workflow files, want 1`);
  const checked = text == null ? null : checkWorkflow(text);
  if (checked) wfProblems.push(...checked.problems);
  const workflow = wfProblems.length ? 0 : 1;

  const fitProblems = checked?.doc ? checkFit(checked.doc, c, facts.files)
    : checked ? ['the workflow doesn\'t parse'] : e.write === true || e.proposal ? ['no workflow to check'] : [];
  const fit = fitProblems.length ? 0 : 1;

  const allowNew = new Set(e.allow_new ?? []);
  const harm = facts.changed.filter(x => x.status !== 'added').map(x => `${x.path} ${x.status}`)
    .concat(added.filter(x => !(e.write !== false && WF.test(x.path)) && !allowNew.has(x.path)).map(x => `${x.path} added`));
  const no_harm = harm.length ? 0 : 1;

  const missing = (e.must_mention ?? []).filter(m => !hasAny(lower(report), m));
  const verdict = missing.length ? null : await judgeFn(e.report, report);
  const reportOk = !missing.length && verdict?.pass ? 1 : 0;

  const complete = workflow && fit && no_harm && reportOk ? 1 : 0;
  return {
    grade: { complete, workflow, fit, no_harm, report: reportOk },
    explanation: {
      complete: complete ? 'a right workflow, nothing else touched, and a report that says what to do next' : 'see the failing metrics',
      workflow: wfProblems.length ? wfProblems.join('; ') : where ? `${where} is valid` : 'no workflow written, as the case wants',
      fit: fitProblems.length ? `${where ?? 'workflow'}: ${fitProblems.join('; ')}` : where ? 'matches the request and the repo' : 'nothing to fit',
      no_harm: harm.length ? `changed: ${harm.join(', ')}` : `changed: ${facts.changed.map(x => `${x.path} ${x.status}`).join(', ') || 'nothing'}`,
      report: missing.length ? `report doesn't mention ${missing.map(m => JSON.stringify(m)).join(', ')}` : `judge ${verdict.pass ? 'PASS' : 'FAIL'}: ${verdict.reason}`,
    },
    judge_model: verdict ? verdict.model : undefined,
    judge_usage: verdict?.usage,
    judge_cost_usd: verdict?.cost_usd,
  };
}

export { removeWorkspace };
