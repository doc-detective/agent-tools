// Grade each case's reference outcome, and outcomes that must not pass. No session runs;
// the judge runs once per distinct report (about $0.02 a call).
//   EVAL_ONLY=docs-dir-ui,readme-only-http node evals/init/check-references.mjs
// A good case:
//   reference     the reference files (the original ones in an `existing` case) and
//                 reference.md, after a Doc Detective run: every metric 1
//   no_run        the same with no Doc Detective run: ran 0
//   wrong_report  the same with expected.json's wrong_report: report 0
//   untouched     (not `existing`) the original workspace: config 0
//   wrong[k]      each of expected.json's `wrong` edits to the reference: complete 0, and its
//                 `fails` metric 0
// Same environment as run-eval.mjs (DD_NODE_DIR; servers on :8092 and :8093). Exit 1 if any case fails.

import { createHash } from 'node:crypto';
import { loadCases, makeWorkspace, checkDown, collect, runConfig, gradeRun, judge, removeWorkspace } from './grade.mjs';
import { ensureServers } from '../spec-generation/grade.mjs';

const dd = { name: 'Bash', input: { command: 'npx doc-detective@5 --input doc-detective-tests/ --output .doc-detective/results/results.json' } };

const memo = (map, key, fn) => { if (!map.has(key)) map.set(key, fn()); return map.get(key); };
const runs = new Map(), verdicts = new Map();
const cachedJudge = (rubric, report) => memo(verdicts, rubric + '\0' + report, () => judge(rubric, report));

async function grade(c, overlay, toolCalls, report) {
  const key = createHash('sha256').update(c.id + JSON.stringify(Object.entries(overlay).sort())).digest('hex');
  const ws = makeWorkspace(c, overlay);
  try {
    const facts = await collect(c, ws, toolCalls, (w, cfg) => memo(runs, key, () => runConfig(w, cfg)));
    return gradeRun(c, { ...facts, report }, cachedJudge);
  } finally { removeWorkspace(ws); }
}

/**
 * The files a `wrong` entry leaves, on top of the reference: its replacements (first match
 * each, in the reference or the original file), whole-file writes, and deletions.
 */
function applyWrong(c, w) {
  const out = { ...c.reference };
  for (const r of w.replace ?? []) {
    const text = out[r.file] ?? c.files[r.file];
    if (!text?.includes(r.from)) throw new Error(`${c.id}: wrong "${w.why}": ${JSON.stringify(r.from)} isn't in ${r.file}`);
    out[r.file] = text.replace(r.from, () => r.to);
  }
  for (const [p, v] of Object.entries(w.write ?? {})) out[p] = typeof v === 'string' ? v : JSON.stringify(v, null, 2) + '\n';
  for (const p of w.delete ?? []) out[p] = null;
  return out;
}

async function check(c) {
  await checkDown(c);
  const e = c.expected, ref = c.reference;
  // [name, outcome, the metric it must fail (null: every metric 1)]
  const checks = [
    ['reference', () => grade(c, ref, [dd], c.referenceReport), null],
    ['no_run', () => grade(c, ref, [], c.referenceReport), 'ran'],
    ['wrong_report', () => grade(c, ref, [dd], e.wrong_report), 'report'],
    ...(e.existing ? [] : [['untouched', () => grade(c, {}, [dd], c.referenceReport), 'config']]),
    ...(e.wrong ?? []).map((w, k) => [`wrong[${k}] ${w.why}`, () => grade(c, applyWrong(c, w), [dd], w.report ?? c.referenceReport), w.fails]),
  ];
  const lines = [];
  let ok = true;
  for (const [name, p, fails] of checks) {
    const g = await p();
    const pass = fails ? g.grade.complete === 0 && g.grade[fails] === 0 : Object.values(g.grade).every(v => v === 1);
    ok &&= pass;
    lines.push(`     ${pass ? 'ok  ' : 'FAIL'} ${name} ${JSON.stringify(g.grade)}\n          ${pass && fails ? `${fails}: ${g.explanation[fails]}` : JSON.stringify(g.explanation)}`);
  }
  return `${ok ? 'ok  ' : 'FAIL'} ${c.id}\n${lines.join('\n')}`;
}

await ensureServers();
const cases = await loadCases();
let bad = 0, i = 0;
// Three cases at a time: each holds a browser per run.
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
await new Promise(r => process.stdout.write('', r));
process.exit(bad ? 1 : 0);
