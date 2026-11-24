//
// Test eval. Each case is a small docs repo with one planted defect or condition: a doc
// that's out of date, a test that's wrong, an invalid spec field, a server that's down,
// a test that skips by design, or nothing wrong at all. Claude Code, with only this
// repo's plugin loaded, runs `/doc-detective-test <target> --fix` in a fresh copy.
//
// The grade is deterministic except `cause`:
//   ran         the session ran Doc Detective (a Bash call that invokes it)
//   cause       the final report names each must_mention string, and an LLM judge
//               agrees it gives the case's cause (expected.json `cause` is the rubric)
//   right_file  only `editable` files changed, and Markdown prose didn't (only test comments)
//   fixed       each test in `fix` passes on the grader's rerun, the test text keeps
//               `must_contain` and drops `must_not_contain`, and when the session edited
//               anything it ran Doc Detective again afterwards
//   no_harm     every other test's rerun result is the one in `after`; on doc_outdated,
//               env, skip, and pass cases nothing changed at all
//   complete    all five
//
// Environment: DD_NODE_DIR, as for spec-generation (see evals/README.md). The pages and
// API come from Doc Detective's test servers on :8092 and :8093 (DD_REPO starts them).

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { tempWorkspace, removeWorkspace } from '../lib/claude-run.mjs';
import { DD_VERSION, toolEnv } from '../spec-generation/grade.mjs';

const WIN = process.platform === 'win32';
const EVAL_DIR = dirname(fileURLToPath(import.meta.url));
const CASES = join(EVAL_DIR, 'cases');
export const JUDGE_MODEL = 'claude-haiku-4-5';
export const KINDS = ['doc_outdated', 'test_wrong', 'invalid', 'env', 'skip', 'pass', 'two'];
const NO_EDIT = new Set(['doc_outdated', 'env', 'skip', 'pass']);

// A `runOn` that skips by design has to name a platform this host isn't.
const [OTHER, OTHER_NAME] = { win32: ['linux', 'Linux'], linux: ['mac', 'macOS'], darwin: ['windows', 'Windows'] }[process.platform] ?? ['mac', 'macOS'];
export const fill = t => t.replaceAll('__OTHER_PLATFORM_NAME__', OTHER_NAME).replaceAll('__OTHER_PLATFORM__', OTHER);

const nl = t => t.replace(/\r\n/g, '\n').replace(/\s+$/, '');
const walk = (root, skip = () => false, d = root) => readdirSync(d, { withFileTypes: true }).flatMap(n => {
  const p = join(d, n.name), rel = relative(root, p).replace(/\\/g, '/');
  if (skip(rel, n)) return [];
  return n.isDirectory() ? walk(root, skip, p) : [rel];
});
const readOr = (p, v = null) => { try { return readFileSync(p, 'utf8'); } catch { return v; } };

export async function loadCases() {
  const sharedConfig = readFileSync(join(EVAL_DIR, 'doc-detective.config.json'), 'utf8');
  const cases = [];
  for (const id of readdirSync(CASES).sort()) {
    const cdir = join(CASES, id);
    const e = JSON.parse(fill(readFileSync(join(cdir, 'expected.json'), 'utf8')));
    if (!KINDS.includes(e.kind)) throw new Error(`cases/${id}: kind must be one of ${KINDS.join(', ')}`);
    const files = Object.fromEntries(walk(join(cdir, 'workspace')).map(p => [p, fill(readFileSync(join(cdir, 'workspace', p), 'utf8'))]));
    files['.doc-detective.json'] ??= sharedConfig;
    if (!(e.target in files)) throw new Error(`cases/${id}: target ${e.target} isn't in workspace/`);
    const refDir = join(cdir, 'reference');
    const reference = existsSync(refDir) ? Object.fromEntries(walk(refDir).map(p => [p, fill(readFileSync(join(refDir, p), 'utf8'))])) : {};
    cases.push({
      id, cdir, kind: e.kind, target: e.target, expected: e, files, reference,
      referenceReport: fill(readFileSync(join(cdir, 'reference.md'), 'utf8')),
      config: JSON.parse(files['.doc-detective.json']),
      prompt: `/doc-detective:doc-detective-test ${e.target} --fix`,
      tags: [e.kind, /\.md$/.test(e.target) ? 'inline' : 'spec', ...(/httpRequest/.test(files[e.target]) ? ['http'] : [])],
    });
  }
  const only = process.env.EVAL_ONLY?.split(',').map(s => s.trim()).filter(Boolean);
  return only?.length ? cases.filter(c => only.includes(c.id)) : cases;
}

/** A fresh one-commit repo holding the case's files, with `overlay` (path -> text) written on top. */
export function makeWorkspace(c, overlay = {}) {
  const ws = tempWorkspace(`test-${c.id}`);
  for (const [p, text] of Object.entries(c.files)) {
    mkdirSync(dirname(join(ws, p)), { recursive: true });
    writeFileSync(join(ws, p), text);
  }
  const git = (...a) => execFileSync('git', ['-c', 'user.name=eval', '-c', 'user.email=eval@example.invalid', '-c', 'core.autocrlf=false', ...a], { cwd: ws, stdio: 'ignore' });
  git('init', '-q'); git('add', '-A'); git('commit', '-qm', 'docs');
  for (const [p, text] of Object.entries(overlay)) {
    mkdirSync(dirname(join(ws, p)), { recursive: true });
    writeFileSync(join(ws, p), text);
  }
  return ws;
}

/** Fail fast, as a harness error, when a URL the case needs down is answering. */
export async function checkDown(c) {
  for (const url of c.expected.down ?? []) {
    let up = false;
    try { await fetch(url, { signal: AbortSignal.timeout(3000) }); up = true; } catch {}
    if (up) throw Object.assign(new Error(`${c.id}: ${url} must be down for this case, but it answers`), { failure_class: 'harness' });
  }
}

// --- what the session changed ----------------------------------------------------

const SKIP_DIRS = new Set(['.git', 'node_modules', '.npm-global', '.doc-detective', '.dd-grade']);
const isResults = text => { try { const j = JSON.parse(text); return Array.isArray(j?.specs) && !!j?.summary; } catch { return false; } };

/**
 * Files the session modified, deleted, or added, as { path, status }. New files count when
 * they could hold docs, tests, or config (.md, .mdx, .json, .yaml); a results file doesn't.
 */
export function changes(c, ws) {
  const out = [];
  for (const [p, text] of Object.entries(c.files)) {
    const now = readOr(join(ws, p));
    if (now == null) out.push({ path: p, status: 'deleted' });
    else if (nl(now) !== nl(text)) out.push({ path: p, status: 'modified' });
  }
  for (const p of walk(ws, (rel, n) => n.isDirectory() && SKIP_DIRS.has(n.name))) {
    if (p in c.files || !/\.(mdx?|json|ya?ml)$/i.test(p)) continue;
    if (!isResults(readOr(join(ws, p), ''))) out.push({ path: p, status: 'added' });
  }
  return out;
}

const COMMENT = /<!--[\s\S]*?-->/g;
/** Markdown prose: the text with comments removed, blank lines and trailing spaces ignored. */
export const prose = t => nl(t).replace(COMMENT, '').split('\n').map(l => l.trimEnd()).filter(Boolean).join('\n');
/** The tests in a file, whitespace removed: a Markdown file's comments, or a whole spec. */
export const testText = (path, t) => (/\.mdx?$/i.test(path) ? (t.match(COMMENT) ?? []).join('') : t).replace(/\s+/g, '');

// --- the session's tool calls ----------------------------------------------------

// `doc-detective` as a command: after npx, a path, or the start of a command, and followed
// by a space or the end. `.doc-detective.json` and `skills/doc-detective-test/` don't match.
const DD_CMD = /(?:^|[\s/(])doc-detective(?:@\S+)?(?=\s|$)|docdetective\/docdetective/;
/** Whether a tool call runs Doc Detective's tests, not just its version, help, dry run, or `validate`. */
export function isDDRun(tc) {
  if (!['Bash', 'PowerShell'].includes(tc?.name)) return false;
  return String(tc.input?.command ?? '').split(/&&|\|\||[;|\n]/)
    .some(seg => DD_CMD.test(seg.trim()) && !/--version|--help|--dry-run|doc-detective(?:@\S+)?\s+(?:-[vh]|validate)(?:\s|$)/.test(seg));
}
/** Whether a tool call can change a file: a file tool, the fix tool without --dry-run, or an in-place shell edit. */
export function isEdit(tc) {
  if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(tc?.name)) return true;
  if (!['Bash', 'PowerShell'].includes(tc?.name)) return false;
  const cmd = String(tc.input?.command ?? '');
  return (/fix-tests\.js/.test(cmd) && !/--dry-run/.test(cmd)) || /\bsed\s+-i|Set-Content|Out-File|writeFileSync/.test(cmd);
}

// --- Doc Detective rerun ---------------------------------------------------------

/**
 * Run the target as the session left it, from the workspace root, with the case's original
 * config (never one the session edited), auto screenshots off. Returns each test's result by
 * testId, and the first failing steps.
 */
export function rerun(c, ws) {
  const out = join(ws, '.dd-grade');
  mkdirSync(out, { recursive: true });
  const config = join(out, 'config.json');
  writeFileSync(config, JSON.stringify({ ...c.config, autoScreenshot: false }));
  const args = ['-y', `doc-detective@${DD_VERSION}`, '-i', c.target, '-c', config,
                '-o', join(out, 'results.json'), '--output-dir', out,
                '--no-auto-update', '--no-telemetry', '--no-hints', '--no-input'];
  return new Promise(resolvePromise => {
    const child = spawn(WIN ? 'npx.cmd' : 'npx', args, { cwd: ws, env: toolEnv(), shell: WIN, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    child.stdout.on('data', d => { log += d; });
    child.stderr.on('data', d => { log += d; });
    const timer = setTimeout(() => child.kill(), 300_000);
    child.on('error', err => { clearTimeout(timer); resolvePromise({ code: null, tests: {}, failures: [], log: `Couldn't start Doc Detective: ${err.message}` }); });
    child.on('close', code => {
      clearTimeout(timer);
      const results = JSON.parse(readOr(join(out, 'results.json'), 'null'));
      const tests = {}, failures = [];
      for (const s of results?.specs ?? []) for (const t of s.tests ?? []) {
        tests[t.testId] = t.result;
        for (const ctx of t.contexts ?? []) for (const st of ctx.steps ?? [])
          if (st.result === 'FAIL') failures.push(`${t.testId}: ${String(st.resultDescription).replace(/\s+/g, ' ').slice(0, 200)}`);
      }
      resolvePromise({ code, tests, failures: failures.slice(0, 5), log: log.slice(-3000) });
    });
  });
}

/**
 * Everything the grade needs from a workspace once the session is done: what changed, the
 * target's test text, the rerun, and the order of Doc Detective runs and edits.
 */
export async function collect(c, ws, toolCalls, rerunFn = rerun) {
  const changed = changes(c, ws);
  const files = Object.fromEntries([...new Set([...Object.keys(c.files), ...changed.map(x => x.path)])].map(p => [p, readOr(join(ws, p))]));
  const runs = toolCalls.flatMap((tc, k) => isDDRun(tc) ? [k] : []);
  const edits = toolCalls.flatMap((tc, k) => isEdit(tc) ? [k] : []);
  return {
    changed, files,
    dd_runs: runs.length,
    reran_after_edit: !edits.length || runs.some(k => k > edits.at(-1)),
    rerun: await rerunFn(c, ws),
  };
}

// --- judge -----------------------------------------------------------------------

const JUDGE_SYSTEM = 'You grade an assistant\'s report to a user about their Doc Detective test run. You get a rubric and the report. Decide whether the report meets the rubric. Judge what the report claims and proposes, not its style or length. A report may say more than the rubric asks; it fails only when it misses what the rubric requires or contradicts it. Reply with only a JSON object: {"verdict": "PASS" or "FAIL", "reason": "<one sentence>"}.';

/** Ask the judge model whether `report` meets `rubric`. Returns { pass, reason, model, usage, cost_usd }. */
export function judge(rubric, report) {
  const prompt = `Rubric:\n${rubric}\n\nReport:\n<report>\n${report}\n</report>`;
  const args = ['-p', prompt, '--model', JUDGE_MODEL, '--output-format', 'json', '--setting-sources', '',
                '--strict-mcp-config', '--tools', '', '--no-session-persistence', '--system-prompt', JUDGE_SYSTEM];
  return new Promise((resolvePromise, reject) => {
    const child = spawn('claude', args, { cwd: EVAL_DIR, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('error', reject);
    child.on('close', code => {
      let r;
      try { r = JSON.parse(out); } catch { return reject(Object.assign(new Error(`judge exited ${code}: ${(err || out).slice(0, 300)}`), { status: /overloaded|rate.?limit/i.test(err + out) ? 529 : undefined })); }
      const m = String(r.result ?? '').match(/\{[\s\S]*\}/);
      let v = {};
      try { v = JSON.parse(m?.[0] ?? '{}'); } catch {}
      const usage = r.usage ? { input_tokens: r.usage.input_tokens ?? 0, output_tokens: r.usage.output_tokens ?? 0,
        cache_read_input_tokens: r.usage.cache_read_input_tokens ?? 0, cache_creation_input_tokens: r.usage.cache_creation_input_tokens ?? 0 } : undefined;
      resolvePromise({ pass: v.verdict === 'PASS', reason: v.reason ?? String(r.result ?? '').slice(0, 200), model: JUDGE_MODEL, usage, cost_usd: r.total_cost_usd });
    });
  });
}

// --- grade -----------------------------------------------------------------------

const lower = s => String(s ?? '').toLowerCase();
const hasAny = (hay, needle) => [].concat(needle).some(n => hay.includes(lower(n)));

/**
 * facts: collect()'s result plus `ran` (DD runs in the session) and `report` (the session's
 * final text). judgeFn defaults to judge(); check-references passes a cached one.
 */
export async function gradeRun(c, facts, judgeFn = judge) {
  const e = c.expected;
  const editable = new Set(e.editable ?? []);
  const report = facts.report ?? '';
  const target = facts.files[c.target] ?? '';
  const tests = facts.rerun.tests;
  const fix = e.fix ?? [];

  const ran = facts.dd_runs > 0 ? 1 : 0;

  const missing = (e.must_mention ?? []).filter(m => !hasAny(lower(report), m));
  const verdict = missing.length ? null : await judgeFn(e.cause, report);
  const cause = !missing.length && verdict?.pass ? 1 : 0;

  const outside = facts.changed.filter(x => !editable.has(x.path)).map(x => `${x.path} ${x.status}`);
  const proseEdits = facts.changed.filter(x => x.status === 'modified' && /\.mdx?$/i.test(x.path) && prose(facts.files[x.path] ?? '') !== prose(c.files[x.path])).map(x => x.path);
  const right_file = !outside.length && !proseEdits.length ? 1 : 0;

  const tt = testText(c.target, target);
  const lostText = (e.must_contain ?? []).filter(m => ![].concat(m).some(n => tt.includes(n.replace(/\s+/g, ''))));
  const keptText = (e.must_not_contain ?? []).filter(m => tt.includes(m.replace(/\s+/g, '')));
  const unfixed = fix.filter(id => tests[id] !== 'PASS');
  const fixed = !fix.length ? 1 : !unfixed.length && !lostText.length && !keptText.length && facts.reran_after_edit ? 1 : 0;

  const moved = Object.entries(e.after).filter(([id, want]) => !fix.includes(id) && tests[id] !== want).map(([id, want]) => `${id} ${tests[id] ?? 'missing'}, want ${want}`);
  const touched = NO_EDIT.has(c.kind) && facts.changed.length > 0;
  const no_harm = !moved.length && !touched ? 1 : 0;

  const complete = ran && cause && right_file && fixed && no_harm ? 1 : 0;
  return {
    grade: { complete, ran, cause, right_file, fixed, no_harm },
    explanation: {
      complete: complete ? 'ran, named the cause, and left the workspace right' : 'see the failing metrics',
      ran: `${facts.dd_runs} Doc Detective run(s) in the session`,
      cause: missing.length ? `report doesn't mention ${missing.map(m => JSON.stringify(m)).join(', ')}` : `judge ${verdict.pass ? 'PASS' : 'FAIL'}: ${verdict.reason}`,
      right_file: right_file ? `changed: ${facts.changed.map(x => x.path).join(', ') || 'nothing'}`
        : [outside.length && `changed outside editable: ${outside.join(', ')}`, proseEdits.length && `prose edited in ${proseEdits.join(', ')}`].filter(Boolean).join('; '),
      fixed: !fix.length ? 'no fix expected'
        : fixed ? `${fix.join(', ')} pass on rerun`
        : [unfixed.length && `not passing: ${unfixed.map(id => `${id} ${tests[id] ?? 'missing'}`).join(', ')}`,
           lostText.length && `test text lost ${JSON.stringify(lostText)}`, keptText.length && `test text still has ${JSON.stringify(keptText)}`,
           !facts.reran_after_edit && 'no Doc Detective run after the last edit'].filter(Boolean).join('; '),
      no_harm: no_harm ? 'other tests keep their expected results' : [moved.length && `results moved: ${moved.join('; ')}`, touched && `edited a ${c.kind} case: ${facts.changed.map(x => x.path).join(', ')}`].filter(Boolean).join('; '),
      rerun: `exit ${facts.rerun.code}; ${JSON.stringify(tests)}${facts.rerun.failures.length ? `; ${facts.rerun.failures.join(' | ')}` : ''}`,
    },
    judge_model: verdict ? verdict.model : undefined,
    judge_usage: verdict?.usage,
    judge_cost_usd: verdict?.cost_usd,
  };
}

export { removeWorkspace };
