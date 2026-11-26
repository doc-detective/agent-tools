//
// Specialist eval. Each case is one question a user asks the doc-detective-specialist agent.
// Claude Code, with only this repo's plugin loaded, runs the whole session as that agent
// (`--agent doc-detective:doc-detective-specialist`) in an empty folder, so routing doesn't
// enter. The grade reads the final answer:
//
//   snippets_valid  every Doc Detective snippet in the answer validates against the pinned schema,
//                   in the v3 shape (a v2 object that only validates by upgrade fails). A snippet is
//                   a fenced JSON or YAML block that is a spec, test, step, list of steps, context,
//                   or config, or a fenced doc block (Markdown, MDX, HTML, AsciiDoc, reST, DITA) with
//                   inline statements, read with the pinned detectTests. A case that expects a
//                   snippet fails when the answer has none.
//   snippets_run    when the case marks a snippet runnable, the first snippet that does what the
//                   case asks runs, after the case's setup steps, with doc-detective@5.6.3 against
//                   the test servers or the shell, and passes. Otherwise 1.
//   correct         an LLM judge agrees the answer states each of the case's facts
//   no_invention    the answer names no CLI flag that doc-detective@5.6.3 lacks, and an LLM judge
//                   agrees it makes none of the case's forbidden claims
//   complete        all four
//
// Ground truth comes from the doc-detective source, its schemas, and runs of 5.6.3, not memory.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import YAML from 'yaml';
import { DD_VERSION, rerun } from '../test/grade.mjs';
import { judge as askJudge } from '../lib/judge.mjs';
import { tempWorkspace, removeWorkspace } from '../lib/claude-run.mjs';

const EVAL_DIR = dirname(fileURLToPath(import.meta.url));
const CASES = join(EVAL_DIR, 'cases');
const WIN = process.platform === 'win32';
export const CATEGORIES = ['syntax', 'inline', 'error', 'choose', 'concept', 'compare', 'false_premise'];
const FLAGS = new Set(JSON.parse(readFileSync(join(EVAL_DIR, 'cli-flags.json'), 'utf8')).flags);
const lower = s => String(s ?? '').toLowerCase();

// --- the pinned doc-detective-common ---------------------------------------------

// The repo's own doc-detective-common is older than the Doc Detective the grade runs, so the
// grade installs the matching release once, outside the repo, and loads it from there.
const COMMON_DIR = join(tmpdir(), `dd-eval-common-${DD_VERSION}`);
let common;
export function ddCommon() {
  if (common) return common;
  const pkg = join(COMMON_DIR, 'node_modules', 'doc-detective-common', 'package.json');
  if (!existsSync(pkg))
    execFileSync(WIN ? 'npm.cmd' : 'npm', ['install', '--no-save', '--no-audit', '--no-fund', '--prefix', COMMON_DIR, `doc-detective-common@${DD_VERSION}`],
      { stdio: 'ignore', shell: WIN });
  const version = JSON.parse(readFileSync(pkg, 'utf8')).version;
  if (version !== DD_VERSION) throw Object.assign(new Error(`${COMMON_DIR} holds doc-detective-common ${version}, want ${DD_VERSION}`), { failure_class: 'harness' });
  common = createRequire(pkg)('doc-detective-common');
  return common;
}

// --- cases -----------------------------------------------------------------------

export async function loadCases() {
  const cases = [];
  const ids = readdirSync(CASES).sort();
  const only = process.env.EVAL_ONLY?.split(',').map(s => s.trim()).filter(Boolean);
  const unknown = (only ?? []).filter(id => !ids.includes(id));
  if (unknown.length) throw new Error(`EVAL_ONLY names no case ${unknown.join(', ')}`);
  for (const id of only?.length ? ids.filter(id => only.includes(id)) : ids) {
    const cdir = join(CASES, id);
    const e = JSON.parse(readFileSync(join(cdir, 'expected.json'), 'utf8'));
    if (!CATEGORIES.includes(e.category)) throw new Error(`cases/${id}: category must be one of ${CATEGORIES.join(', ')}`);
    if (!e.question || !e.facts?.length || !e.must_not?.length) throw new Error(`cases/${id}: needs question, facts, and must_not`);
    // Each fact names the docs (and schema, where one applies) on doc-detective's main that support it.
    for (const f of e.facts) if (!f?.text || !f.sources?.length) throw new Error(`cases/${id}: each fact needs text and sources`);
    if (e.snippet?.run && !e.snippet.run.require?.length) throw new Error(`cases/${id}: snippet.run needs require`);
    cases.push({
      id, cdir, expected: e,
      prompt: e.question,
      referenceAnswer: readFileSync(join(cdir, 'reference.md'), 'utf8'),
      tags: [e.category, ...(e.snippet?.run ? ['runnable'] : e.snippet ? ['snippet'] : [])],
    });
  }
  return cases;
}

// --- snippets --------------------------------------------------------------------

/** Fenced code blocks, in order ({ lang, text }), and the lines outside them. */
function splitFences(md) {
  const blocks = [], prose = [];
  let open = null;
  for (const line of String(md).split(/\r?\n/)) {
    if (!open) {
      // A backtick fence's info string has no backticks (CommonMark), so a line that starts
      // with four backticks and holds more is inline code, not a fence.
      const m = line.match(/^([ \t]*)(`{3,}|~{3,})(.*)$/);
      if (m && !(m[2][0] === '`' && m[3].includes('`')))
        open = { indent: m[1].length, fence: m[2], lang: lower(m[3].trim().match(/^[^\s{]*/)[0]), lines: [] };
      else prose.push(line);
    } else if (new RegExp(`^[ \\t]*${open.fence[0] === '`' ? '`' : '~'}{${open.fence.length},}[ \\t]*$`).test(line)) {
      blocks.push({ lang: open.lang, text: open.lines.join('\n') });
      open = null;
    } else open.lines.push(line.slice(Math.min(open.indent, line.match(/^[ \t]*/)[0].length)));
  }
  return { blocks, prose };
}
export const fencedBlocks = md => splitFences(md).blocks;

const INLINE_LANGS = { markdown: 'markdown', md: 'markdown', mdx: 'markdown', html: 'html', htm: 'html', xml: 'dita', dita: 'dita',
  asciidoc: 'asciidoc', adoc: 'asciidoc', rst: 'rst', rest: 'rst', restructuredtext: 'rst' };
const EXT = { markdown: 'md', html: 'html', dita: 'dita', asciidoc: 'adoc', rst: 'rst' };
const DATA_LANGS = new Set(['json', 'jsonc', 'json5', 'yaml', 'yml', '']);
// The start of an inline statement, in any built-in format's comment syntax.
const STMT_START = String.raw`(?:<!--|\{\/\*|\[comment\]:\s*#\s*['"(]|<\?doc-detective|^[ \t]*\/\/\s*\(?|^[ \t]*\.\.)\s*`;
// A word before `step {` (`<!-- doc-detective step {...} -->`) is a statement Doc Detective doesn't read, so it counts.
const STEP_STMT = new RegExp(STMT_START + String.raw`(?:step\b|[\w-]+[ \t]+step[ \t]*\{)`, 'gm');
const ANY_STMT = new RegExp(STMT_START + String.raw`(?:test|step)\b`, 'm');
// Statements Doc Detective rightly doesn't read: in a sample fenced inside the block, or in an ignore region.
const IGNORED = new RegExp(String.raw`^[ \t]*(\`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$|`
  + STMT_START + String.raw`test\s+ignore\s+start[\s\S]*?test\s+ignore\s+end`, 'gm');
const SHELL_LANGS = new Set(['bash', 'sh', 'shell', 'console', 'zsh', 'powershell', 'ps1', 'pwsh', 'cmd', 'bat', '']);

function parseData(text, lang) {
  const plain = text.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1');
  const tries = [text, plain, ...(/^\s*"/.test(plain) ? [`{${plain}}`] : [])];
  for (const t of tries) { try { return { ok: true, value: JSON.parse(t) }; } catch {} }
  if (!lang.startsWith('json')) { try { const v = YAML.parse(text); if (v && typeof v === 'object') return { ok: true, value: v }; } catch {} }
  return { ok: false };
}

const isStep = o => !!o && typeof o === 'object' && !Array.isArray(o)
  && (Object.keys(o).some(k => ddCommon().stepActions.includes(k)) || typeof o.action === 'string');
let configOnly;
/** The schema objects a parsed block holds, or null when it isn't Doc Detective input. */
function classify(v) {
  if (Array.isArray(v)) return v.length && v.every(isStep) ? v.map(object => ({ schemaKey: 'step_v3', object })) : null;
  if (!v || typeof v !== 'object') return null;
  if ('summary' in v && 'specs' in v) return null; // a results report, not input
  if ('tests' in v) return [{ schemaKey: 'spec_v3', object: v }];
  if ('steps' in v) return [{ schemaKey: 'test_v3', object: v }];
  if (isStep(v)) return [{ schemaKey: 'step_v3', object: v }];
  const s = ddCommon().schemas, keys = Object.keys(v);
  configOnly ??= new Set(Object.keys(s.config_v3.properties).filter(k =>
    ![s.spec_v3, s.test_v3, s.context_v3].some(o => k in (o.properties ?? {}))));
  if (keys.length && (keys.every(k => k in s.config_v3.properties) || keys.some(k => configOnly.has(k)))) return [{ schemaKey: 'config_v3', object: v }];
  if (keys.length && keys.every(k => k in s.context_v3.properties) && (v.platforms || v.browsers)) return [{ schemaKey: 'context_v3', object: v }];
  return null;
}

/** Steps an object classified as `schemaKey` runs, in order. */
const stepsOf = ({ schemaKey, object }) =>
  schemaKey === 'step_v3' ? [object]
  : schemaKey === 'test_v3' ? [].concat(object.steps ?? [])
  : schemaKey === 'spec_v3' ? [].concat(object.tests ?? []).flatMap(t => [].concat(t?.steps ?? []))
  : [];

const ddLooking = text => new RegExp(`"(?:tests|steps|${ddCommon().stepActions.join('|')})"\\s*:`).test(text);

/**
 * Every Doc Detective snippet in an answer: { lang, kind, valid, why, steps }. Fenced blocks that
 * aren't Doc Detective input (a workflow, a shell command, an app's code) aren't snippets.
 */
export async function snippets(answer) {
  const { validate, detectTests, defaultFileTypes } = ddCommon();
  const out = [];
  for (const b of fencedBlocks(answer)) {
    // A doc block with statements is an inline snippet; so is an unlabeled one that isn't data.
    const ft = !ANY_STMT.test(b.text) ? null
      : INLINE_LANGS[b.lang] ?? ((DATA_LANGS.has(b.lang) || b.lang === 'text') && !parseData(b.text, b.lang).ok ? 'markdown' : null);
    if (ft) {
      const invalid = [];
      const tests = await detectTests({ content: b.text, filePath: `snippet.${b.lang === 'mdx' ? 'mdx' : EXT[ft]}`, fileType: defaultFileTypes[ft],
        config: { detectSteps: false, logLevel: 'silent' }, onInvalid: r => invalid.push(String(r).slice(0, 200)) });
      const steps = tests.flatMap(t => t.steps ?? []).map(({ location, ...st }) => st);
      const want = (b.text.replace(IGNORED, '').match(STEP_STMT) ?? []).length;
      const why = invalid.length ? `invalid statement: ${invalid[0]}`
        : steps.length < want ? `${want} step statement(s), but Doc Detective reads ${steps.length}` : null;
      out.push({ lang: b.lang, kind: `inline ${ft}`, valid: !why, why, steps });
      continue;
    }
    if (!DATA_LANGS.has(b.lang)) continue;
    const p = parseData(b.text, b.lang);
    if (!p.ok) {
      if (ddLooking(b.text)) out.push({ lang: b.lang, kind: 'unparsed', valid: false, why: `a ${b.lang || 'plain'} block that doesn't parse`, steps: [] });
      continue;
    }
    const parts = classify(p.value);
    if (!parts) continue;
    const errors = [];
    for (const part of parts) {
      const r = validate({ schemaKey: part.schemaKey, object: part.object, addDefaults: false });
      if (!r.valid) errors.push(`${part.schemaKey}: ${r.errors.slice(0, 200)}`);
      else if (r.object !== part.object) errors.push(`${part.schemaKey}: only valid as a v2 object (the action name must be the key)`);
    }
    out.push({ lang: b.lang, kind: parts[0].schemaKey, valid: !errors.length, why: errors[0] ?? null, steps: parts.flatMap(stepsOf) });
  }
  return out;
}

/** Flags on a `doc-detective` command in a shell block or inline code that 5.6.3 doesn't have. */
export function unknownFlags(answer) {
  const CMD = /(?:^|[\s(])(?:npx\s+(?:-\S+\s+)*)?doc-detective(?:@[\w.^~-]+)?(?=\s|$)(.*)$/;
  const { blocks, prose } = splitFences(answer);
  const lines = [
    ...blocks.filter(b => SHELL_LANGS.has(b.lang)).flatMap(b => b.text.split('\n')),
    // Inline code outside fences; a span opens and closes with the same run of backticks.
    ...prose.flatMap(l => [...l.matchAll(/(`+)(.+?)\1(?!`)/g)].map(m => m[2])),
  ];
  const out = new Set();
  for (const line of lines) {
    const m = line.match(CMD);
    if (!m || /\b(?:npm|pnpm|yarn|bun)\s+(?:i|install|add|remove|uninstall|update)\b/.test(line.slice(0, m.index + 1))) continue;
    for (const f of m[1].split(/[|;&]/)[0].match(/(?<![\w-])--[a-zA-Z][\w-]*/g) ?? []) if (!FLAGS.has(f)) out.add(f);
  }
  return [...out];
}

// --- running a snippet -------------------------------------------------------------

/** Whether a step does one of `want`'s actions with each of its strings (any case) in the step. */
const matches = (want, step) => Object.entries(want).some(([action, has]) =>
  action in step && [].concat(has).every(h => lower(JSON.stringify(step)).includes(lower(h))));

/** Run a spec with the pinned Doc Detective in a scratch folder: { code, tests, failures, log }. */
export async function runSpec(spec) {
  const ws = tempWorkspace('specialist-run');
  try {
    writeFileSync(join(ws, 'answer.spec.json'), JSON.stringify(spec, null, 2));
    return await rerun({ config: { autoRecord: false }, target: 'answer.spec.json' }, ws);
  } finally { removeWorkspace(ws); }
}

async function runSnippets(c, found, runFn) {
  const run = c.expected.snippet?.run;
  if (!run) return { score: 1, why: 'nothing to run' };
  const ok = found.filter(s => s.valid && s.steps.length);
  const does = steps => run.require.every(w => steps.some(st => matches(w, st)));
  let steps = ok.find(s => does(s.steps))?.steps;
  if (!steps && does(ok.flatMap(s => s.steps))) steps = ok.flatMap(s => s.steps);
  if (!steps) return { score: 0, why: `no valid snippet ${run.does}` };
  const r = await runFn({ tests: [{ testId: 'answer', steps: [...(run.setup ?? []), ...steps] }] });
  const result = r.tests.answer;
  return { score: ['PASS', 'WARNING'].includes(result) ? 1 : 0,
    why: `ran ${steps.length} step(s) after ${run.setup?.length ?? 0} setup: ${result ?? 'no result'} (exit ${r.code})${r.failures.length ? `; ${r.failures.join(' | ')}` : ''}` };
}

// --- grade -----------------------------------------------------------------------

export const CORRECT_SYSTEM = 'You grade an answer to a user\'s question about Doc Detective, a tool that tests documentation. You get the question, the facts the answer must state, and the answer. PASS when the answer states every listed fact, in any words, or shows it in a snippet. A fact that offers alternatives with "or" needs only one of them. FAIL when the answer misses or contradicts a listed fact, or only asks the user a question instead of answering. Don\'t judge style, length, or anything not on the list. Reply with only a JSON object: {"verdict": "PASS" or "FAIL", "reason": "<one sentence>"}.';
export const NO_INVENTION_SYSTEM = 'You check an answer to a user\'s question about Doc Detective, a tool that tests documentation, for specific false claims. You get the question, the claims the answer must not make, and the answer. FAIL when the answer makes any listed claim, in any words or through a snippet or command. Naming a claim only to say it\'s false or to warn against it is fine. Ignore everything else: style, length, and claims not on the list. Reply with only a JSON object: {"verdict": "PASS" or "FAIL", "reason": "<one sentence>"}.';

// When the judge's JSON doesn't parse (an unescaped quote in its reason), askJudge returns the raw
// text as the reason and counts it FAIL. A raw text that gives one clear PASS verdict is a PASS.
export const judge = async (system, rubric, answer) => {
  const v = await askJudge(rubric, answer, system);
  return !v.pass && /"verdict"\s*:\s*"PASS"/.test(v.reason) && !/"verdict"\s*:\s*"FAIL"/.test(v.reason) ? { ...v, pass: true } : v;
};
const bullets = xs => xs.map(x => `- ${x}`).join('\n');
const addUsage = (a, b) => !a ? b : !b ? a : Object.fromEntries(Object.keys(a).map(k => [k, (a[k] ?? 0) + (b[k] ?? 0)]));

/** facts: { answer }. judgeFn(system, rubric, answer) defaults to judge(); check-references passes its own. */
export async function gradeRun(c, facts, judgeFn = judge, runFn = runSpec) {
  const e = c.expected;
  const answer = facts.answer ?? '';
  const found = await snippets(answer);

  const bad = found.filter(s => !s.valid);
  const missing = e.snippet && !found.length;
  const snippets_valid = bad.length || missing ? 0 : 1;
  const ran = await runSnippets(c, found, runFn);
  const snippets_run = ran.score;

  const q = `Question: ${e.question}\n\n`;
  const [vc, vn] = await Promise.all([
    judgeFn(CORRECT_SYSTEM, `${q}The answer must state each of these:\n${bullets(e.facts.map(f => f.text))}`, answer),
    judgeFn(NO_INVENTION_SYSTEM, `${q}The answer must not claim any of these:\n${bullets(e.must_not)}`, answer),
  ]);
  const correct = vc.pass ? 1 : 0;
  // A flag the question names is the user's; an answer may quote it to say it doesn't exist.
  // Endorsing it is a `must_not` claim, which the judge catches.
  const flags = unknownFlags(answer).filter(f => !new RegExp(`${f}(?![\\w-])`).test(e.question));
  const no_invention = vn.pass && !flags.length ? 1 : 0;

  const complete = snippets_valid && snippets_run && correct && no_invention ? 1 : 0;
  return {
    grade: { complete, snippets_valid, snippets_run, correct, no_invention },
    explanation: {
      complete: complete ? 'right, valid, working, and nothing invented' : 'see the failing metrics',
      snippets_valid: missing ? 'the case expects a snippet and the answer has none'
        : bad.length ? bad.map(s => `${s.kind}: ${s.why}`).join('; ')
        : `${found.length} snippet(s), all valid${found.length ? `: ${found.map(s => s.kind).join(', ')}` : ''}`,
      snippets_run: ran.why,
      correct: `judge ${vc.pass ? 'PASS' : 'FAIL'}: ${vc.reason}`,
      no_invention: [flags.length && `flags 5.6.3 doesn't have: ${flags.join(', ')}`, `judge ${vn.pass ? 'PASS' : 'FAIL'}: ${vn.reason}`].filter(Boolean).join('; '),
    },
    judge_model: vc.model ?? vn.model,
    judge_usage: addUsage(vc.usage, vn.usage),
    judge_cost_usd: (vc.cost_usd ?? 0) + (vn.cost_usd ?? 0) || undefined,
  };
}

export { removeWorkspace, tempWorkspace };
