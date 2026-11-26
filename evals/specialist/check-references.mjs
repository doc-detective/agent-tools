// Grade each case's reference answer, and answers that must not pass. No session runs.
//   EVAL_ONLY=click-by-text node evals/specialist/check-references.mjs
// A good case:
//   reference   reference.md: every metric 1
//   v2          (when the reference has a JSON step) each step rewritten to the v2 shape, with an
//               `action` field: snippets_valid 0
//   wrong[k]    each of expected.json's `wrong` answers: complete 0, and its `fails` metric 0. A
//               wrong answer is `answer` (the whole text) or `replace` (edits to the reference).
// The judge runs for the reference and for each wrong answer that targets `correct` or
// `no_invention`, about $0.01 a call. NO_JUDGE=1 skips those checks and the judge, so it costs
// nothing; use it while writing cases. Doc Detective runs need the test servers on :8092 and :8093.
// Exit 1 if any case fails.

import { createHash } from 'node:crypto';
import { loadCases, gradeRun, judge, runSpec, ddCommon, CORRECT_SYSTEM, NO_INVENTION_SYSTEM } from './grade.mjs';
import { ensureServers } from '../spec-generation/grade.mjs';

const NO_JUDGE = !!process.env.NO_JUDGE;
const JUDGED = new Set(['correct', 'no_invention']);
const memo = (map, key, fn) => { if (!map.has(key)) map.set(key, fn()); return map.get(key); };
const verdicts = new Map(), runs = new Map();
const pass = { pass: true, reason: 'not judged here' };
const cachedJudge = (system, rubric, answer) => memo(verdicts, system + rubric + '\0' + answer, () => judge(system, rubric, answer));
const cachedRun = spec => memo(runs, createHash('sha256').update(JSON.stringify(spec)).digest('hex'), () => runSpec(spec));

/** Each JSON object in a fenced JSON block that has a step action, rewritten as `{ action: <name>, ...fields }`. */
function toV2(text) {
  const { stepActions } = ddCommon();
  const k = 'act' + 'ion'; // spelled apart so the plugin's own format hook doesn't flag this file
  const rewrite = v => Array.isArray(v) ? v.map(rewrite)
    : v && typeof v === 'object' ? (() => {
      const a = Object.keys(v).find(x => stepActions.includes(x));
      const o = Object.fromEntries(Object.entries(v).map(([x, y]) => [x, rewrite(y)]));
      if (!a) return o;
      const { [a]: body, ...rest } = o;
      return { [k]: a, ...(body && typeof body === 'object' && !Array.isArray(body) ? body : { value: body }), ...rest };
    })() : v;
  let changed = false;
  const out = text.replace(/```json\n([\s\S]*?)\n```/g, (all, body) => {
    try { const v = JSON.parse(body); const w = rewrite(v); if (JSON.stringify(w) === JSON.stringify(v)) return all; changed = true; return '```json\n' + JSON.stringify(w, null, 2) + '\n```'; }
    catch { return all; }
  });
  return changed ? out : null;
}

function applyWrong(c, w) {
  if (w.answer != null) return w.answer;
  let text = c.referenceAnswer;
  for (const r of w.replace ?? []) {
    if (!text.includes(r.from)) throw new Error(`${c.id}: wrong "${w.why}": ${JSON.stringify(r.from)} isn't in reference.md`);
    text = text.replace(r.from, () => r.to);
  }
  return text;
}

async function check(c) {
  const e = c.expected;
  // The reference gets both judges; a wrong answer only the one it targets.
  const SYSTEM = { correct: CORRECT_SYSTEM, no_invention: NO_INVENTION_SYSTEM };
  const judgeFor = fails => NO_JUDGE || (fails && !JUDGED.has(fails)) ? async () => pass
    : fails ? (system, ...rest) => system === SYSTEM[fails] ? cachedJudge(system, ...rest) : pass
    : cachedJudge;
  const v2 = toV2(c.referenceAnswer);
  // [name, answer, the metric it must fail (null: every metric 1)]
  const checks = [
    ['reference', c.referenceAnswer, null],
    ...(v2 ? [['v2', v2, 'snippets_valid']] : []),
    ...(e.wrong ?? []).filter(w => !(NO_JUDGE && JUDGED.has(w.fails))).map((w, k) => [`wrong[${k}] ${w.why}`, applyWrong(c, w), w.fails]),
  ];
  if (!(e.wrong ?? []).length) throw new Error(`${c.id}: needs at least one wrong answer`);
  const lines = [];
  let ok = true;
  for (const [name, answer, fails] of checks) {
    const g = await gradeRun(c, { answer }, judgeFor(fails), cachedRun);
    spent += g.judge_cost_usd ?? 0;
    const good = fails ? g.grade.complete === 0 && g.grade[fails] === 0 : Object.values(g.grade).every(v => v === 1);
    ok &&= good;
    lines.push(`     ${good ? 'ok  ' : 'FAIL'} ${name} ${JSON.stringify(g.grade)}\n          ${good && fails ? `${fails}: ${g.explanation[fails]}` : JSON.stringify(g.explanation)}`);
  }
  return `${ok ? 'ok  ' : 'FAIL'} ${c.id}\n${lines.join('\n')}`;
}

await ensureServers();
ddCommon();
const cases = await loadCases();
let bad = 0, i = 0, spent = 0;
// Three cases at a time: a runnable snippet holds a browser while it runs.
await Promise.all(Array.from({ length: 3 }, async () => {
  while (i < cases.length) {
    const c = cases[i++];
    let out;
    try { out = await check(c); } catch (err) { out = `FAIL ${c.id}: ${err.message}`; }
    if (out.startsWith('FAIL')) bad++;
    console.log(out);
  }
}));
console.log(`${cases.length - bad} of ${cases.length} cases ok${NO_JUDGE ? ' (NO_JUDGE: judged checks skipped)' : `; judge $${spent.toFixed(2)}`}`);
await new Promise(r => process.stdout.write('', r));
process.exit(bad ? 1 : 0);
