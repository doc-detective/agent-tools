//
// Inline eval. Each case is one documentation source file. Claude Code, with only
// this repo's plugin loaded, runs `/doc-detective-inline ... --apply` on it in a
// fresh workspace, either with a spec to inject (`spec.json` / `spec.yaml` in the
// case) or with none, so the session writes the tests first (`expected.json`).
//
// The grade is deterministic and runs no browser:
//   comment_only  the session's edits only add comments: drop them and the original comes back
//   coverage      `doc-detective --dry-run` on the edited file detects the expected steps
//                 (spec given: the spec's steps, in order, in the test with the same testId;
//                 no spec: expected.json, scored with spec-generation's matcher over the
//                 steps inside test markers)
//   complete      comment_only and full coverage
//   placement     each added step comment sits after the text it tests
//   detected      the dry run found at least one step
//
// Environment: DD_NODE_DIR, as for spec-generation (see evals/README.md).

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import YAML from 'yaml';
import { tempWorkspace, removeWorkspace } from '../lib/claude-run.mjs';
import { DD_VERSION, toolEnv, coverage } from '../spec-generation/grade.mjs';

const WIN = process.platform === 'win32';
const CASES = join(fileURLToPath(new URL('.', import.meta.url)), 'cases');

export async function loadCases() {
  const cases = [];
  for (const id of readdirSync(CASES).sort()) {
    const cdir = join(CASES, id);
    const files = readdirSync(cdir);
    const docFile = files.find(f => f.startsWith('doc.'));
    const specFile = files.find(f => /^spec\.(json|ya?ml)$/.test(f));
    if (!docFile || !files.includes(`reference${extname(docFile)}`) || (!specFile && !files.includes('expected.json')))
      throw new Error(`cases/${id}: needs doc.<ext>, reference.<ext>, and spec.json, spec.yaml, or expected.json`);
    const ext = extname(docFile);
    const name = id.split('-').slice(2).join('-');
    const docPath = `docs/${name}${ext}`;
    const specPath = specFile && `tests/${name}.spec${extname(specFile)}`;
    const cfg = join(cdir, 'workspace', '.doc-detective.json');
    cases.push({
      id, name, cdir, docFile, docPath, ext, specFile, specPath,
      spec: specFile ? YAML.parse(readFileSync(join(cdir, specFile), 'utf8')) : null,
      expected: specFile ? null : JSON.parse(readFileSync(join(cdir, 'expected.json'), 'utf8')),
      config: existsSync(cfg) ? JSON.parse(readFileSync(cfg, 'utf8')) : {},
      prompt: `/doc-detective:doc-detective-inline ${specPath ? `${specPath} ` : ''}${docPath} --apply`,
      tags: [ext.slice(1), specFile ? 'spec' : 'no-spec'],
    });
  }
  const only = process.env.EVAL_ONLY?.split(',').map(s => s.trim()).filter(Boolean);
  return only?.length ? cases.filter(c => only.includes(c.id)) : cases;
}

export function makeWorkspace(c) {
  const ws = tempWorkspace('inline');
  if (existsSync(join(c.cdir, 'workspace'))) cpSync(join(c.cdir, 'workspace'), ws, { recursive: true });
  mkdirSync(join(ws, 'docs'), { recursive: true });
  cpSync(join(c.cdir, c.docFile), join(ws, c.docPath));
  if (c.specFile) {
    mkdirSync(join(ws, 'tests'), { recursive: true });
    cpSync(join(c.cdir, c.specFile), join(ws, c.specPath));
  }
  return ws;
}

// --- dry run ------------------------------------------------------------------

/**
 * `doc-detective --dry-run` on the edited text, alone in a scratch folder, with the
 * case's own config (never the one the session may have edited) and `detectSteps: false`,
 * so only inline statements count, not steps inferred from prose. Exit 0 prints the test
 * plan as JSON; exit 2 means no tests, or an invalid step that stops the whole file.
 */
export function dryRun(c, text) {
  const dir = tempWorkspace('inline-grade');
  const file = join(dir, `${c.name}${c.ext}`);
  writeFileSync(file, text);
  writeFileSync(join(dir, 'dd.json'), JSON.stringify({ ...c.config, detectSteps: false }));
  const args = ['-y', `doc-detective@${DD_VERSION}`, '--dry-run', '-c', 'dd.json', '--input', file,
                '--no-env-file', '--no-auto-update', '--no-telemetry', '--no-hints', '--no-input'];
  return new Promise(resolvePromise => {
    const child = spawn(WIN ? 'npx.cmd' : 'npx', args, { cwd: dir, env: toolEnv(), shell: WIN, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    const timer = setTimeout(() => child.kill(), 120_000);
    const done = (code, tests, log) => { clearTimeout(timer); removeWorkspace(dir); resolvePromise({ code, tests, log }); };
    child.on('error', e => done(null, [], `Couldn't start Doc Detective: ${e.message}`));
    child.on('close', code => {
      let plan = null;
      try { plan = code === 0 ? JSON.parse(out) : null; } catch {}
      done(code, plan ? testsOf(plan, dir) : [], err.trim().slice(0, 1000));
    });
  });
}

/**
 * Each detected test as { testId, steps }, steps from its first context. Doc Detective
 * resolves relative paths (`screenshot`, `loadVariables`) against the file's folder, `dir`,
 * so those come back relative again.
 */
export function testsOf(plan, dir) {
  const list = x => (Array.isArray(x) ? x : []);
  const rel = v => typeof v === 'string' && v.toLowerCase().startsWith(dir.toLowerCase() + (WIN ? '\\' : '/'))
    ? v.slice(dir.length + 1).replace(/\\/g, '/')
    : Array.isArray(v) ? v.map(rel) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rel(x)])) : v;
  return list(plan?.specs).flatMap(s => list(s?.tests).map(t => ({ testId: t.testId, steps: list(t.contexts?.[0]?.steps).map(rel) })));
}

// --- comment-only ---------------------------------------------------------------

const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const COMMENTS = {
  md: [HTML_COMMENT],
  html: [HTML_COMMENT],
  // MDX ends a comment at its first `*/`, so a payload holding `*/` leaves text behind.
  mdx: [/\{\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g],
  dita: [HTML_COMMENT, /<\?doc-detective[\s\S]*?\?>/g],
  adoc: [/^[ \t]*\/\/.*$/gm],
  // A `..` block that isn't a directive, target, footnote, or substitution, with the lines
  // indented deeper than it. It may itself be indented, inside a directive such as `note`.
  rst: [/^([ \t]*)\.\.(?![ \t]+(?:[\w:-]+::|_|\[|\|))(?:[ \t].*)?$(?:\n\1[ \t]+\S.*$)*/gm],
};
const FAMILY = { '.md': 'md', '.markdown': 'md', '.mdx': 'mdx', '.html': 'html', '.htm': 'html',
                 '.dita': 'dita', '.ditamap': 'dita', '.xml': 'dita', '.adoc': 'adoc', '.asciidoc': 'adoc', '.asc': 'adoc', '.rst': 'rst' };

/** Text with every comment in the file type's syntax removed. */
export function stripComments(text, ext) {
  return COMMENTS[FAMILY[ext]].reduce((t, re) => t.replace(re, ''), text);
}

const linesOf = t => t.replace(/\r\n/g, '\n').replace(/\s+$/, '').split('\n');

/**
 * For each original line (1-based), whether a line added right after it lands inside a
 * code block, where a comment is code, not a comment. Fenced blocks in Markdown, MDX, and
 * AsciiDoc; in reStructuredText, the indented body after a `::` line, which only an
 * indented added line joins. HTML `<pre>` and DITA `<codeblock>` aren't checked.
 */
function codeAfter(lines, ext) {
  const fam = FAMILY[ext];
  const fence = fam === 'md' || fam === 'mdx' ? /^\s*(```|~~~)/ : fam === 'adoc' ? /^(----|\.\.\.\.)\s*$/ : null;
  const after = [false];
  let inside = false;
  for (const l of lines) {
    // ponytail: any fence line toggles; a longer fence nested in a shorter one confuses it.
    if (fence) { if (fence.test(l)) inside = !inside; }
    // A `::` paragraph or a code directive starts code; other directives, such as `note`, hold prose.
    else if (fam === 'rst') inside = (/::\s*$/.test(l) && !/^\s*\.\. [\w:-]+::/.test(l)) || /^\s*\.\. (code-block|code|sourcecode)::/.test(l) || (inside && (!l.trim() || /^\s/.test(l)));
    after.push(inside);
  }
  return after;
}

function lcsTable(a, b, eq = (x, y) => x === y) {
  const w = b.length + 1;
  const t = new Int32Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      t[i * w + j] = eq(a[i], b[j]) ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
  return { len: t[0], at: (i, j) => t[i * w + j] };
}

/**
 * Whether `output` is `original` plus comments. Lines are diffed (trailing spaces and
 * line endings ignored); each run of added lines, with its comments removed, must leave
 * blank lines only, or exactly the lines it replaced (a comment added inside a line).
 * Any deleted or reworded line fails. Also returns, for each output line, whether the
 * session added it and how many original lines come before it (`anchor`).
 */
export function commentOnly(original, output, ext) {
  const a = linesOf(original).map(l => l.trimEnd()), b = linesOf(output).map(l => l.trimEnd());
  const { at } = lcsTable(a, b);
  const code = codeAfter(a, ext);
  const added = [], anchor = [];
  const bad = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { added[j] = false; anchor[j] = i + 1; i++; j++; continue; }
    const del = [], ins = [];
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) break;
      if (j < b.length && (i >= a.length || at(i, j + 1) >= at(i + 1, j))) ins.push(b[j++]);
      else del.push(a[i++]);
    }
    for (let k = j - ins.length; k < j; k++) { added[k] = true; anchor[k] = i; }
    const rest = stripComments(ins.join('\n'), ext).split('\n').map(l => l.trimEnd()).filter(Boolean);
    const first = ins.find(l => l.trim());
    if (rest.length !== del.length || rest.some((l, k) => l !== del[k]))
      bad.push(del.length ? `line ${i - del.length + 1} changed: ${JSON.stringify(del[0].slice(0, 80))}` : `added non-comment text: ${JSON.stringify(rest[0].slice(0, 80))}`);
    else if (!del.length && first && code[i] && (FAMILY[ext] !== 'rst' || /^\s/.test(first)))
      bad.push(`added a comment inside the code block before line ${i + 1}`);
  }
  return { ok: bad.length === 0, reason: bad.slice(0, 3).join('; '), added, anchor };
}

// --- steps ------------------------------------------------------------------------

const META = new Set(['location', 'stepId', 'description']);
const sortKeys = v => Array.isArray(v) ? v.map(sortKeys)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])]))
  : typeof v === 'string' ? v.replace(/^\.\//, '') : v;
/** A step's action and values, as a comparable string: no location, stepId, or description; `./x` reads as `x`. */
export const canon = s => JSON.stringify(sortKeys(Object.fromEntries(Object.entries(s ?? {}).filter(([k]) => !META.has(k)))));
const bare = s => Object.fromEntries(Object.entries(s ?? {}).filter(([k]) => k !== 'location'));

/** Spec given: each spec test's steps, in order, within the detected test of the same testId. */
export function specCoverage(spec, detected) {
  let hit = 0, total = 0;
  const misses = [];
  for (const t of spec.tests ?? []) {
    const want = (t.steps ?? []).map(canon);
    const got = detected.filter(d => d.testId === t.testId).flatMap(d => d.steps.map(canon));
    const n = lcsTable(want, got).len;
    hit += n; total += want.length;
    if (n < want.length) misses.push(`${t.testId}: ${n} of ${want.length} steps${got.length ? '' : ' (no test with this testId)'}`);
  }
  return { score: total ? hit / total : 1, misses };
}

const actionOf = s => Object.keys(s).find(k => !META.has(k) && !['unsafe', 'outputs', 'variables', 'breakpoint'].includes(k));
/** The text a step tests: its string value, or the `keys`, `url`, or `elementText` of an object value. */
export function matchValue(step) {
  const p = step[actionOf(step)];
  return typeof p === 'string' ? p : [p?.keys, p?.url, p?.elementText].find(v => typeof v === 'string') ?? null;
}

/**
 * Of the added step comments whose match value appears in the original at or after the
 * previous step's text, the share that sit close after it: the value is in the block of
 * original lines (up to a blank line) that ends at the comment, or in the block before
 * that, and not before the previous step's block. A step that rechecks earlier text
 * isn't counted.
 */
export function placement(original, cmp, detected) {
  const orig = linesOf(original);
  const low = orig.map(l => l.toLowerCase());
  // [first, last] line of the block of non-blank lines ending at or before line e.
  const block = e => {
    while (e > 0 && !orig[e - 1].trim()) e--;
    let s = Math.max(e, 1);
    while (s > 1 && orig[s - 2].trim()) s--;
    return [s, e];
  };
  let checkable = 0, placed = 0, ours = 0;
  const misplaced = [];
  for (const t of detected) {
    let prevStart = 1;
    for (const s of t.steps) {
      const k = (s.location?.line ?? 0) - 1;
      const [start, end] = block(cmp.anchor[k] ?? 0);
      const from = Math.max(block(start - 1)[0], prevStart);
      const v = matchValue(s)?.toLowerCase();
      if (cmp.added[k]) {
        ours++;
        if (v && low.slice(prevStart - 1).some(l => l.includes(v))) {
          checkable++;
          if (low.slice(from - 1, end).some(l => l.includes(v))) placed++;
          else misplaced.push(`${t.testId} ${actionOf(s)} ${JSON.stringify(v).slice(0, 60)} at line ${k + 1}`);
        }
      }
      prevStart = start;
    }
  }
  return { score: checkable ? placed / checkable : ours ? 1 : 0, misplaced, checkable };
}

// --- grade ------------------------------------------------------------------------

/**
 * The tests a `test` marker declares. Steps outside every marker still run, but as a
 * test of their own that Doc Detective names `<file>~<hash>`, apart from the test they
 * belong to, so they don't count toward coverage.
 */
export const declared = tests => tests.filter(t => !/~[0-9a-f]{8}$/.test(String(t.testId)));

/** run: { text: the doc as the session left it (null when missing), dry: dryRun's result } */
export function gradeRun(c, run) {
  const original = readFileSync(join(c.cdir, c.docFile), 'utf8');
  const text = run.text ?? '';
  const cmp = commentOnly(original, text, c.ext);
  const tests = run.dry?.tests ?? [];
  const steps = tests.flatMap(t => t.steps.map(bare));
  const cov = c.spec ? specCoverage(c.spec, tests) : coverage(c.expected.steps, declared(tests).flatMap(t => t.steps.map(bare)));
  const place = placement(original, cmp, tests);
  const comment_only = run.text != null && cmp.ok ? 1 : 0;
  return {
    grade: {
      complete: comment_only && cov.score === 1 ? 1 : 0,
      comment_only,
      coverage: Number(cov.score.toFixed(3)),
      placement: Number(place.score.toFixed(3)),
      detected: steps.length ? 1 : 0,
    },
    explanation: {
      complete: !comment_only ? 'edits more than comments' : cov.score === 1 ? 'only comments, every expected step detected' : 'only comments, but misses expected steps',
      comment_only: run.text == null ? 'doc file missing' : cmp.ok ? 'only comments added' : cmp.reason,
      coverage: cov.misses.length ? `missing: ${cov.misses.join('; ')}` : 'all expected steps detected',
      placement: place.misplaced.length ? `not after their text: ${place.misplaced.slice(0, 5).join('; ')}`
        : place.checkable ? 'every checkable step after its text' : "no added step's text is in the doc",
      detected: `doc-detective --dry-run exit ${run.dry?.code}; ${steps.length} step(s) in ${tests.length} test(s)${run.dry?.code ? `: ${run.dry.log.split('\n')[0]}` : ''}`,
    },
    // Steps whose text placement could check; 0 means placement had nothing to judge.
    checkable: place.checkable,
  };
}
