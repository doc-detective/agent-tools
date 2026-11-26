// Grade each case's reference outcome, and outcomes that must not pass. No session runs;
// the judge runs once per distinct (rubric, report), about $0.01 a call.
//   EVAL_ONLY=basic-root-config,pr-only node evals/install-github-action/check-references.mjs
// A good case:
//   reference      reference/ files and reference.md: every metric 1
//   untouched      (write cases) the original workspace and reference.md: workflow 0
//   wrong_report   the reference files and expected.json's wrong_report: report 0
//   wrong[k]       each of expected.json's `wrong` outcomes: complete 0, and its `fails` metric 0
// Exit 1 if any case fails.

import assert from 'node:assert/strict';
import { loadCases, makeWorkspace, collect, gradeRun, judge, removeWorkspace, globRe, runsFor, norm, triggers, proposedWorkflow, checkWorkflow } from './grade.mjs';

const memo = (map, key, fn) => { if (!map.has(key)) map.set(key, fn()); return map.get(key); };
const verdicts = new Map();
const cachedJudge = (rubric, report) => memo(verdicts, `${rubric}\0${report}`, () => judge(rubric, report));

async function grade(c, overlay, report) {
  const ws = makeWorkspace(c, overlay);
  try { return await gradeRun(c, { ...collect(c, ws), report }, cachedJudge); } finally { removeWorkspace(ws); }
}

/**
 * The files a `wrong` entry leaves: the reference files (or, with `"base": "original"`, none)
 * plus its first-match replacements and whole-file writes.
 */
function applyWrong(c, w) {
  const out = w.base === 'original' ? {} : { ...c.reference };
  for (const r of w.replace ?? []) {
    const text = out[r.file] ?? c.files[r.file];
    if (!text?.includes(r.from)) throw new Error(`${c.id}: wrong "${w.why}": ${JSON.stringify(r.from)} isn't in ${r.file}`);
    out[r.file] = text.replace(r.from, () => r.to);
  }
  return { ...out, ...w.write };
}

async function check(c) {
  const e = c.expected;
  const checks = [
    ['reference', () => grade(c, c.reference, c.referenceReport), g => Object.values(g.grade).every(v => v === 1)],
    ...(e.write === true ? [['untouched', () => grade(c, {}, c.referenceReport), g => g.grade.workflow === 0]] : []),
    ['wrong_report', () => grade(c, c.reference, e.wrong_report), g => g.grade.report === 0],
    ...(e.wrong ?? []).map((w, k) => [`wrong[${k}] ${w.why}`, () => grade(c, applyWrong(c, w), w.report ?? c.referenceReport),
      g => g.grade.complete === 0 && g.grade[w.fails] === 0]),
  ];
  const lines = [];
  let ok = true;
  for (const [name, run, want] of checks) {
    const g = await run();
    const pass = want(g);
    ok &&= pass;
    lines.push(`     ${pass ? 'ok  ' : 'FAIL'} ${name} ${JSON.stringify(g.grade)}${pass && name !== 'reference' ? '' : `\n          ${JSON.stringify(g.explanation)}`}`);
  }
  return `${ok ? 'ok  ' : 'FAIL'} ${c.id}\n${lines.join('\n')}`;
}

// The helpers, on shapes sessions write.
assert.equal(globRe('packages/docs/**').test('packages/docs/content/a.md'), true);
assert.equal(globRe('docs/*').test('docs/a/b.md'), false);
assert.equal(globRe('**/*.md').test('a.md'), true);
assert.equal(globRe('**.md').test('docs/a.md'), true);
assert.equal(runsFor({ paths: ['docs/**', '!docs/drafts/**'] }, 'docs/drafts/x.md'), false);
assert.equal(runsFor({ 'paths-ignore': ['packages/api/**'] }, 'packages/api/x.ts'), false);
assert.equal(runsFor(null, 'anything'), true);
assert.equal(norm('./docs/'), 'docs');
assert.equal(norm(''), '.');
assert.equal(norm(undefined), '.');
assert.deepEqual(triggers(['push', 'pull_request']), { push: null, pull_request: null });
assert.equal(proposedWorkflow('x\n```yaml\nuses: doc-detective/github-action@v2\n```\n'), 'uses: doc-detective/github-action@v2\n');
assert.equal(proposedWorkflow('```yaml\nname: other\n```'), null);
const lintless = text => checkWorkflow(text, null).problems;
const minimal = 'on: pull_request\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: doc-detective/github-action@v2\n';
assert.deepEqual(lintless(minimal), []);
assert.match(lintless(minimal.replace('pull_request', 'pull-request')).join(), /isn't a GitHub Actions event/);
assert.match(lintless(`${minimal}        with:\n          issue_mentions: [claude]\n`).join(), /must be a string/);
assert.match(lintless(`${minimal}        with:\n          prompt: hi\n`).join(), /deprecated/);
// A session that runs the tests locally leaves Doc Detective's results; they aren't its edits.
{
  const c = { id: 'results-output', files: { 'README.md': '# Docs\n' }, expected: {} };
  const ws = makeWorkspace(c, {
    'results.json': '{}',
    'testResults-1764000000000.json': JSON.stringify({ summary: {}, specs: [] }),
    '.doc-detective/runs/1/step.png': 'x',
    'notes.md': '# Notes\n',
  });
  try { assert.deepEqual(collect(c, ws).changed, [{ path: 'notes.md', status: 'added' }]); } finally { removeWorkspace(ws); }
}

const cases = await loadCases();
let bad = 0, i = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (i < cases.length) {
    const c = cases[i++];
    let out;
    try { out = await check(c); } catch (err) { out = `FAIL ${c.id}: ${err.message}`; }
    if (out.startsWith('FAIL')) bad++;
    console.log(out);
  }
}));
console.log(`${cases.length - bad} of ${cases.length} cases ok (${verdicts.size} judge calls)`);
// Exit only once stdout drains, so a piped log keeps the last lines.
await new Promise(r => process.stdout.write('', r));
process.exit(bad ? 1 : 0);
