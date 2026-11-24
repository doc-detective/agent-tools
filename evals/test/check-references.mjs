// Grade each case's reference outcome, and outcomes that must not pass. No session runs;
// the judge runs once per distinct report (about $0.02 a call).
//   EVAL_ONLY=outdated-md,pass-http node evals/test/check-references.mjs
// A good case:
//   reference      the reference files and reference.md, after a Doc Detective run (and an
//                  edit and a second run when there are files): every metric 1
//   no_run         the same with no Doc Detective run: ran 0
//   wrong_report   the same with expected.json's wrong_report: cause 0
//   unfixed        (fix cases) the original files: fixed 0
//   no_rerun       (fix cases) the reference files, no run after the edit: fixed 0
//   wrong[k]       each of expected.json's `wrong` edits: complete 0, and its `fails` metric 0
// Same environment as run-eval.mjs (DD_NODE_DIR; servers on :8092 and :8093). Exit 1 if any case fails.

import { createHash } from 'node:crypto';
import { loadCases, makeWorkspace, checkDown, collect, rerun, gradeRun, judge, removeWorkspace } from './grade.mjs';
import { ensureServers } from '../spec-generation/grade.mjs';

const dd = c => ({ name: 'Bash', input: { command: `npx doc-detective@5 --input ${c.target} --output results.json` } });
const edit = p => ({ name: 'Edit', input: { file_path: p } });

const memo = (map, key, fn) => { if (!map.has(key)) map.set(key, fn()); return map.get(key); };
const reruns = new Map(), verdicts = new Map();
const cachedJudge = (rubric, report) => memo(verdicts, rubric + '\0' + report, () => judge(rubric, report));

async function grade(c, overlay, toolCalls, report) {
  const key = createHash('sha256').update(c.id + JSON.stringify(Object.entries(overlay).sort())).digest('hex');
  const ws = makeWorkspace(c, overlay);
  try {
    const facts = await collect(c, ws, toolCalls, () => memo(reruns, key, () => rerun(c, ws)));
    return gradeRun(c, { ...facts, report }, cachedJudge);
  } finally { removeWorkspace(ws); }
}

/** The files a `wrong` entry leaves: its replacements (first match each) and whole-file writes. */
function applyWrong(c, w) {
  const out = {};
  for (const r of w.replace ?? []) {
    const text = out[r.file] ?? c.files[r.file];
    if (!text?.includes(r.from)) throw new Error(`${c.id}: wrong "${w.why}": ${JSON.stringify(r.from)} isn't in ${r.file}`);
    out[r.file] = text.replace(r.from, () => r.to);
  }
  for (const [p, v] of Object.entries(w.write ?? {})) out[p] = typeof v === 'string' ? v : JSON.stringify(v, null, 2) + '\n';
  return out;
}

async function check(c) {
  await checkDown(c);
  const e = c.expected, ref = c.reference, edited = Object.keys(ref);
  const refCalls = edited.length ? [dd(c), ...edited.map(edit), dd(c)] : [dd(c)];
  const checks = [
    ['reference', () => grade(c, ref, refCalls, c.referenceReport), g => Object.values(g.grade).every(v => v === 1)],
    ['no_run', () => grade(c, ref, [], c.referenceReport), g => g.grade.ran === 0],
    ['wrong_report', () => grade(c, ref, refCalls, e.wrong_report), g => g.grade.cause === 0],
    ...(e.fix?.length ? [
      ['unfixed', () => grade(c, {}, [dd(c)], c.referenceReport), g => g.grade.fixed === 0],
      ['no_rerun', () => grade(c, ref, [dd(c), ...edited.map(edit)], c.referenceReport), g => g.grade.fixed === 0],
    ] : []),
    ...(e.wrong ?? []).map((w, k) => [`wrong[${k}]`, () => grade(c, applyWrong(c, w), [dd(c), edit(Object.keys(applyWrong(c, w))[0]), dd(c)], c.referenceReport),
      g => g.grade.complete === 0 && g.grade[w.fails] === 0]),
  ];
  const lines = [];
  let ok = true;
  for (const [name, p, want] of checks) {
    const g = await p();
    const pass = want(g);
    ok &&= pass;
    lines.push(`     ${pass ? 'ok  ' : 'FAIL'} ${name} ${JSON.stringify(g.grade)}${pass && name !== 'reference' ? '' : `\n          ${JSON.stringify(g.explanation)}`}`);
  }
  return `${ok ? 'ok  ' : 'FAIL'} ${c.id}\n${lines.join('\n')}`;
}

await ensureServers();
const cases = await loadCases();
let bad = 0, i = 0;
// Three cases at a time: each holds a browser per rerun.
await Promise.all(Array.from({ length: 3 }, async () => {
  while (i < cases.length) {
    const c = cases[i++];
    let out;
    try { out = await check(c); } catch (err) { out = `FAIL ${c.id}: ${err.message}`; }
    if (out.startsWith('FAIL')) bad++;
    console.log(out);
  }
}));
console.log(`${cases.length - bad} of ${cases.length} cases ok`);
process.exit(bad ? 1 : 0);
