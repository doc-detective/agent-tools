//
// Validate eval. Each case is a Doc Detective spec or config: a file in a small one-commit
// repo, or JSON pasted into the prompt. The session gets `/doc-detective-validate <args>`.
// The grade reads the final report and the workspace, and the ground truth is the pinned
// Doc Detective's own `validate` (check-references.mjs proves expected.json matches it):
//   verdict        the report's verdict is the right one: the last `Validation PASSED` or
//                  `Validation FAILED` in it that isn't negated, or, with neither (and on a
//                  case that asks for a fix), the judge's reading of the input as given
//   fields         every field the validator names is named in the report, by its path
//                  (`tests[0].steps[1]`, `tests.0.steps.1`, or `/tests/0/steps/1`); and no
//                  other field is reported as invalid (the judge reads only the extra paths).
//                  A file the validator rejects whole names no field, so nothing is extra.
//   no_false_pass  on an invalid input, the report never says it passes
//   no_harm        no file changed or added, except the files the prompt asked to fix
//   complete       all four
//
// Environment: DD_NODE_DIR, as for the test eval (see evals/README.md).

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { parse as parseYaml } from 'yaml';
import { makeWorkspace, changes, DD_VERSION } from '../test/grade.mjs';
import { toolEnv } from '../spec-generation/grade.mjs';
import { tempWorkspace, removeWorkspace } from '../lib/claude-run.mjs';
import { judge as baseJudge, JUDGE_MODEL } from '../lib/judge.mjs';

const EVAL_DIR = dirname(fileURLToPath(import.meta.url));
const CASES = join(EVAL_DIR, 'cases');
const WIN = process.platform === 'win32';
export const KINDS = ['spec', 'config'];
export { JUDGE_MODEL, DD_VERSION, removeWorkspace };

const walk = (root, d = root) => readdirSync(d, { withFileTypes: true }).flatMap(n =>
  n.isDirectory() ? walk(root, join(d, n.name)) : [relative(root, join(d, n.name)).replace(/\\/g, '/')]);

export function loadCases() {
  const cases = [];
  for (const id of readdirSync(CASES).sort()) {
    const cdir = join(CASES, id);
    const e = JSON.parse(readFileSync(join(cdir, 'expected.json'), 'utf8'));
    if (!KINDS.includes(e.kind)) throw new Error(`cases/${id}: kind must be one of ${KINDS.join(', ')}`);
    if (!['valid', 'invalid'].includes(e.verdict)) throw new Error(`cases/${id}: verdict must be valid or invalid`);
    if (!!e.pasted === !!e.input) throw new Error(`cases/${id}: set one of input (a workspace file) or pasted (a case file)`);
    const files = Object.fromEntries(walk(join(cdir, 'workspace')).map(p => [p, readFileSync(join(cdir, 'workspace', p), 'utf8')]));
    const text = e.pasted ? readFileSync(join(cdir, e.pasted), 'utf8') : files[e.input];
    if (text == null) throw new Error(`cases/${id}: input ${e.input} isn't in workspace/`);
    const refDir = join(cdir, 'reference');
    const reference = existsSync(refDir) ? Object.fromEntries(walk(refDir).map(p => [p, readFileSync(join(refDir, p), 'utf8')])) : {};
    cases.push({
      id, cdir, kind: e.kind, expected: e, files, text, reference,
      name: e.pasted ?? e.input,
      referenceReport: readFileSync(join(cdir, 'reference.md'), 'utf8'),
      prompt: `/doc-detective:doc-detective-validate ${e.args.replace('{{pasted}}', () => text)}`,
      tags: [e.kind, e.verdict, ...(e.pasted ? ['pasted'] : [])],
    });
  }
  const only = process.env.EVAL_ONLY?.split(',').map(s => s.trim()).filter(Boolean);
  if (!only?.length) return cases;
  const unknown = only.filter(id => !cases.some(c => c.id === id));
  if (unknown.length) throw new Error(`EVAL_ONLY names no case ${unknown.join(', ')}`);
  return cases.filter(c => only.includes(c.id));
}

// --- ground truth: the pinned Doc Detective's `validate` ------------------------------

const VALID_PROBE = '{"tests":[{"steps":[{"goTo":"http://localhost:8092"}]}]}\n';

function npx(args, cwd) {
  const argv = WIN ? args.map(a => /\s/.test(a) ? `"${a}"` : a) : args;
  return new Promise((resolvePromise, reject) => {
    const child = spawn(WIN ? 'npx.cmd' : 'npx', ['-y', `doc-detective@${DD_VERSION}`, ...argv],
      { cwd, env: toolEnv(), shell: WIN, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', reject);
    child.on('close', code => resolvePromise({ code, stdout, stderr }));
  });
}

/**
 * What the pinned validator says about a case's input, checked alone in an empty folder:
 * { verdict, errors, note }. A spec runs `validate --json <file>`. A config runs
 * `validate --config <file>` on a valid probe spec, so only the config can fail.
 */
export async function validatorSays(c) {
  const dir = tempWorkspace(`validate-truth-${c.id}`);
  try {
    mkdirSync(dirname(join(dir, c.name)), { recursive: true });
    writeFileSync(join(dir, c.name), c.text);
    if (c.kind === 'spec') {
      const r = await npx(['validate', '--json', '--no-input', c.name], dir);
      if (r.code === 0 || r.code === 1) {
        const out = JSON.parse(r.stdout);
        return { verdict: out.valid ? 'valid' : 'invalid', errors: out.files.flatMap(f => f.errors), note: null };
      }
      return { verdict: r.code === 2 ? 'invalid' : `exit ${r.code}`, errors: [], note: firstLine(r.stderr || r.stdout) };
    }
    writeFileSync(join(dir, 'probe.spec.json'), VALID_PROBE);
    const r = await npx(['validate', '--no-input', '--config', c.name, 'probe.spec.json'], dir);
    if (r.code === 0) return { verdict: 'valid', errors: [], note: null };
    const lines = r.stderr.replace(/\r/g, '').split('\n');
    const at = lines.findIndex(l => l.startsWith('Error: Invalid config in'));
    if (r.code === 2 && at >= 0) {
      const errors = [];
      for (const l of lines.slice(at + 1)) { if (!l.trim() || l.startsWith('See ')) break; errors.push(l.trim()); }
      return { verdict: 'invalid', errors, note: null };
    }
    return { verdict: r.code === 2 ? 'invalid' : `exit ${r.code}`, errors: [], note: lines.find(l => l.startsWith('Error:')) ?? firstLine(r.stderr) };
  } finally { removeWorkspace(dir); }
}
const firstLine = t => String(t).replace(/\r/g, '').split('\n').find(l => l.trim()) ?? '';

// --- field paths ------------------------------------------------------------------

/** A path as segments: `tests[0].steps[1]`, `tests.0.steps.1`, `/tests/0/steps/1`, and `#/...` all give the same. */
export function segments(token) {
  let t = String(token).trim().replace(/^\$\.?/, '').replace(/^#/, '');
  if (t.startsWith('/')) return t.split('/').filter(Boolean).map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  return t.replace(/\[["']([^"']+)["']\]/g, '.$1').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
}
const startsWith = (a, b) => b.length <= a.length && b.every((s, i) => a[i] === s);

/**
 * A validator error line as { line, path, key, field }. `tests[0].steps[2]: unknown key `foo`.`
 * has path tests/0/steps/2 and key foo, so its field is tests/0/steps/2/foo; a root-level
 * `unknown key `foo`.` has an empty path.
 */
export function parseError(line) {
  const m = line.match(/^([A-Za-z_$][\w$-]*(?:\[\d+\]|\.[\w$-]+)*): (.*)$/);
  const path = m ? segments(m[1]) : [];
  const key = (m ? m[2] : line).match(/^unknown (?:key|action) `([^`]+)`/)?.[1];
  return { line, path, key, field: key ? [...path, key] : path };
}

const POINTER = /(?:#|\$)?(?:\/[A-Za-z_$\d][\w$-]*)+/g;
const DOTTED = /(?<![\w$/.-])(?:\$\.)?[A-Za-z_$][\w$-]*(?:\[\d+\]|\[["'][^"'\]]+["']\]|\.[\w$-]+)+/g;
// A bare key reported as `key: reason`: at a line's start (after a list marker or bold), or backticked anywhere.
const BARE = /(?:^[ \t]*(?:[-*+]|\d+\.)?[ \t]*(?:\*\*)?`?([a-z_$][\w$-]*)`?(?:\*\*)?[ \t]*:(?!\/))|(?:`([a-z_$][\w$-]*)`(?:\*\*)?[ \t]*:)/gm;

/** The field paths a report mentions, as segment arrays (deduplicated). */
export function reportPaths(report) {
  const out = new Map();
  for (const m of report.matchAll(POINTER)) out.set(m[0], segments(m[0]));
  for (const m of report.matchAll(DOTTED)) out.set(m[0], segments(m[0]));
  for (const m of report.matchAll(BARE)) { const k = m[1] ?? m[2]; out.set(k, [k]); }
  return [...out.entries()].map(([token, segs]) => ({ token, segs })).filter(x => x.segs.length);
}

const wordIn = (report, w) => new RegExp(`(?<![\\w$-])${w.replace(/[$]/g, '\\$')}(?![\\w$-])`).test(report);

/** Whether the report names this validator error: a path at or under its field, or its path plus its key. */
export function names(report, err, paths = reportPaths(report)) {
  if (paths.some(p => startsWith(p.segs, err.field))) return true;
  if (err.field.length === 1 && wordIn(report, err.field[0])) return true;
  return !!err.key && paths.some(p => p.segs.length === err.path.length && startsWith(p.segs, err.path)) && wordIn(report, err.key);
}

/**
 * Paths the report gives that no validator error accounts for: not a parent of an error's
 * field, not under it, and (for an unknown key) not a sibling key on the same object, such as
 * the fix. Only paths rooted at one of the input's top-level keys, or holding an array index,
 * count: `README.md` or `e.g` aren't field paths.
 */
export function extraPaths(report, errs, roots) {
  return reportPaths(report).filter(({ segs }) => {
    if (!roots.has(segs[0]) && !segs.some(s => /^\d+$/.test(s))) return false;
    return !errs.some(e => startsWith(e.field, segs) || (e.path.length && startsWith(segs, e.path)));
  }).map(p => p.token);
}

/** The input's top-level keys, plus `tests`. A file that doesn't parse has only `tests`. */
export function rootKeys(c) {
  let doc = null;
  try { doc = /\.ya?ml$/i.test(c.name) ? parseYaml(c.text) : JSON.parse(c.text); } catch {}
  return new Set(['tests', ...(doc && typeof doc === 'object' && !Array.isArray(doc) ? Object.keys(doc) : [])]);
}

// --- the grade --------------------------------------------------------------------

const JUDGE_SYSTEM = 'You read an assistant\'s final report to a user who asked whether a Doc Detective test spec or config file is valid. You get a question about the report and the report. Answer the question from what the report claims and tells the user, not its style or length. Reply with only a JSON object: {"verdict": "PASS" or "FAIL", "reason": "<one sentence>"}.';
export const judge = (rubric, report) => baseJudge(rubric, report, JUDGE_SYSTEM);

const what = c => c.kind === 'spec' ? 'test spec' : 'config';
const AS_GIVEN = 'Judge the input as the user gave it, before any fix the report describes.';
const SAYS_VALID = c => `${AS_GIVEN} PASS if the report tells the user that the ${what(c)} is valid: it passes validation, would load, or has no errors. FAIL if it says the input is invalid, would be rejected, isn't a Doc Detective ${what(c)}, or that it couldn't confirm either way.`;
const SAYS_INVALID = c => `${AS_GIVEN} PASS if the report tells the user that the ${what(c)} is invalid: it fails validation, would be rejected or not load, has errors, or isn't a Doc Detective ${what(c)} at all. A report that says the input failed at first and passes after a fix says it's invalid. FAIL if it says the input is valid, or that it couldn't confirm either way.`;
const CLAIMS_EXTRA = extra => `Look only at these fields: ${extra.map(x => `\`${x}\``).join(', ')}. FAIL if the report says any of them fails validation or has an invalid value, for example as \`${extra[0]}: <reason>\` in a list of errors. PASS if it names them only as context, as part of the input, as valid, as the fix for some other error, or with a warning (such as a deprecation) that doesn't say the field fails validation.`;

// A marker the report negates ("there is no `Validation PASSED`") isn't a verdict.
const NEGATED = /(?:\b(?:no|not|never|without)\b|n't\b)[^.\n]{0,12}$/i;
/** The report's verdict markers, in order: true for PASSED, false for FAILED. */
export const markers = report => [...report.matchAll(/validation\W{0,3}(passed|failed)/gi)]
  .filter(m => !NEGATED.test(report.slice(Math.max(0, m.index - 30), m.index))).map(m => /passed/i.test(m[1]));

/** facts: { changed, report }. judgeFn defaults to judge(). */
export async function gradeRun(c, facts, judgeFn = judge) {
  const e = c.expected, report = facts.report ?? '';
  const errs = e.errors.map(parseError);
  const verdicts = [];
  const ask = async rubric => { const v = await judgeFn(rubric, report); verdicts.push(v); return v; };

  // After a requested fix, a closing `Validation PASSED` is about the fixed file, so the judge
  // reads the verdict on the file as given.
  const marks = e.allow_edit ? [] : markers(report);
  let said;
  if (marks.length) said = marks.at(-1) ? 'valid' : 'invalid';
  else said = (await ask(e.verdict === 'valid' ? SAYS_VALID(c) : SAYS_INVALID(c))).pass ? e.verdict : 'other';
  const verdict = said === e.verdict ? 1 : 0;

  let falsePass = false;
  if (e.verdict === 'invalid') falsePass = marks.includes(true) || (!marks.length ? (await ask(SAYS_VALID(c))).pass : false);
  const no_false_pass = falsePass ? 0 : 1;

  const paths = reportPaths(report);
  // A file-level error (`It isn't valid JSON or YAML.`) names no field; the verdict covers it.
  const missing = errs.filter(err => err.field.length && !names(report, err, paths)).map(err => err.line);
  // When the validator rejects the whole file (no tests found, a parse error), it names no
  // field to compare with, and a report that explains which keys the file has invents nothing.
  const fileLevel = e.verdict === 'invalid' && !errs.some(x => x.field.length);
  const extra = fileLevel ? [] : extraPaths(report, errs, rootKeys(c));
  const invented = extra.length ? !(await ask(CLAIMS_EXTRA(extra))).pass : false;
  const fields = !missing.length && !invented ? 1 : 0;

  const allow = new Set(e.allow_edit ?? []);
  const harm = facts.changed.filter(x => !(x.status === 'modified' && allow.has(x.path))).map(x => `${x.path} ${x.status}`);
  const no_harm = harm.length ? 0 : 1;

  const complete = verdict && fields && no_false_pass && no_harm ? 1 : 0;
  const usage = verdicts.reduce((u, v) => { for (const k of Object.keys(v.usage ?? {})) u[k] = (u[k] ?? 0) + v.usage[k]; return u; }, {});
  return {
    grade: { complete, verdict, fields, no_false_pass, no_harm },
    explanation: {
      complete: complete ? 'the right verdict, every invalid field named, and nothing changed' : 'see the failing metrics',
      verdict: `${marks.length ? 'marker' : 'judge'}: said ${said}, want ${e.verdict}`,
      fields: [missing.length && `missing ${missing.join(' | ')}`, extra.length && `extra ${extra.join(', ')} (${invented ? 'reported as invalid' : 'not reported as invalid'})`].filter(Boolean).join('; ') || 'every field named, none extra',
      no_false_pass: e.verdict === 'valid' ? 'valid input' : falsePass ? 'says an invalid input passes' : 'never says it passes',
      no_harm: harm.length ? `changed: ${harm.join(', ')}` : `changed: ${facts.changed.map(x => `${x.path} ${x.status}`).join(', ') || 'nothing'}`,
    },
    judge_model: verdicts.length ? JUDGE_MODEL : undefined,
    judge_usage: verdicts.length ? usage : undefined,
    judge_cost_usd: verdicts.reduce((s, v) => s + (v.cost_usd ?? 0), 0) || undefined,
  };
}

/** What the session changed in the workspace, from the test eval's diff. */
export const collect = (c, ws) => ({ changed: changes(c, ws) });

// `doc-detective ... validate` in a shell call, bare or through npx.
const VALIDATE = /doc-detective(?:@\S+)?\s+(?:\S+\s+)*?validate\b|doc-detective-validate-test\.js/;
/** How many shell calls ran a validator. */
export const validatorCalls = toolCalls => toolCalls.filter(tc => ['Bash', 'PowerShell'].includes(tc?.name) && VALIDATE.test(String(tc.input?.command ?? ''))).length;

export { makeWorkspace };
