// Check each case against the real validator, then grade its reference outcome and outcomes
// that must not pass. No session runs; the judge runs once per distinct (question, report),
// about $0.01 a call. Doc Detective runs once per case.
//   EVAL_ONLY=spec-valid-basic,config-invalid-enum node evals/validate/check-references.mjs
// A good case:
//   truth          the pinned `doc-detective validate` gives expected.json's verdict and
//                  exactly its error lines
//   reference      reference/ files (if any) and reference.md: every metric 1
//   cli_report     the validator's own error lines and the right marker: every metric 1
//   flipped        the reference with the other marker: verdict 0 (and no_false_pass 0 when
//                  the input is invalid)
//   unmarked_pass  (invalid) "Looks good, this would load.": verdict 0, no_false_pass 0
//   dropped        (2+ field errors) the CLI report without its first error: fields 0
//   invented       the CLI report plus an error at a field the validator didn't name: fields 0
//   harm           the reference report, with the input edited (or, for pasted input, a
//                  scratch file added): no_harm 0
// Exit 1 if any case fails.

import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { loadCases, validatorSays, makeWorkspace, collect, gradeRun, judge, removeWorkspace,
  segments, parseError, names, reportPaths, extraPaths, markers } from './grade.mjs';

const memo = (map, key, fn) => { if (!map.has(key)) map.set(key, fn()); return map.get(key); };
const verdicts = new Map();
const cachedJudge = (rubric, report) => memo(verdicts, `${rubric}\0${report}`, () => judge(rubric, report));

async function grade(c, overlay, report) {
  const ws = makeWorkspace(c, overlay);
  try { return await gradeRun(c, { ...collect(c, ws), report }, cachedJudge); } finally { removeWorkspace(ws); }
}

const FAILED = 'Validation FAILED', PASSED = 'Validation PASSED';
const cliReport = errors => [...errors.map(l => `- ${l}`), '', /* marker added by caller */].join('\n');

async function check(c) {
  const e = c.expected;
  const lines = [];
  let ok = true;
  const truth = await validatorSays(c);
  const truthOk = truth.verdict === e.verdict && isDeepStrictEqual(truth.errors, e.errors);
  ok &&= truthOk;
  lines.push(`     ${truthOk ? 'ok  ' : 'FAIL'} truth ${truth.verdict} ${truth.errors.length} error(s)${truthOk ? '' : `\n          validator says ${JSON.stringify(truth)}`}`);

  const invalid = e.verdict === 'invalid';
  const marker = invalid ? FAILED : PASSED;
  const cli = `${cliReport(e.errors)}${marker}`;
  const fieldErrs = e.errors.map(parseError).filter(x => x.field.length);
  // An error at a field no validator error covers: a new test index for a spec, a new fileTypes index for a config.
  const bogus = c.kind === 'spec' ? '`tests[3].testId`: must be string.' : '`fileTypes[4]`: must be one of markdown, asciidoc, html, dita, rst (got "txt").';
  // The grade ignores trailing whitespace, so an edit has to change the text itself.
  const edited = e.pasted ? { 'scratch.spec.json': c.text }
    : { [e.input]: /\.ya?ml$/.test(e.input) ? `# edited\n${c.text}` : c.text.replace(/\n\s*/g, '') };
  const all1 = g => Object.values(g.grade).every(v => v === 1);
  const checks = [
    ['reference', () => grade(c, c.reference, c.referenceReport), all1],
    ['cli_report', () => grade(c, c.reference, cli), all1],
    // On a fix case the closing marker is about the fixed file, so the flip is a plain wrong verdict.
    ['flipped', () => grade(c, c.reference, e.allow_edit ? `The file has no errors as given.\n\n${PASSED}`
      : c.referenceReport.replace(/Validation (PASSED|FAILED)/g, '').trimEnd() + `\n\n${invalid ? PASSED : FAILED}`),
      g => g.grade.verdict === 0 && g.grade.complete === 0 && (!invalid || g.grade.no_false_pass === 0)],
    ...(invalid ? [['unmarked_pass', () => grade(c, c.reference, 'Looks good: this would load without any problems.'),
      g => g.grade.verdict === 0 && g.grade.no_false_pass === 0]] : []),
    ...(fieldErrs.length >= 2 ? [['dropped', () => grade(c, c.reference, `${cliReport(e.errors.filter(l => l !== fieldErrs[0].line))}${FAILED}`),
      g => g.grade.fields === 0 && g.grade.complete === 0]] : []),
    // A file rejected whole names no field, so there's nothing to invent against.
    ...(invalid && !fieldErrs.length ? [] : [['invented', () => grade(c, c.reference, `${cliReport(e.errors)}- ${bogus}\n\n${FAILED}`),
      g => g.grade.fields === 0 && g.grade.complete === 0]]),
    ['harm', () => grade(c, { ...edited, ...(e.allow_edit ? { 'README.md': '# Changed\n' } : {}) }, c.referenceReport),
      g => g.grade.no_harm === 0 && g.grade.complete === 0],
  ];
  for (const [name, run, want] of checks) {
    const g = await run();
    const pass = want(g);
    ok &&= pass;
    lines.push(`     ${pass ? 'ok  ' : 'FAIL'} ${name} ${JSON.stringify(g.grade)}${pass ? '' : `\n          ${JSON.stringify(g.explanation)}`}`);
  }
  return `${ok ? 'ok  ' : 'FAIL'} ${c.id}\n${lines.join('\n')}`;
}

// The path helpers, on the notations a report uses.
assert.deepEqual(segments('tests[0].steps[2].foo'), ['tests', '0', 'steps', '2', 'foo']);
assert.deepEqual(segments('/tests/0/steps/2/foo'), ['tests', '0', 'steps', '2', 'foo']);
assert.deepEqual(segments('#/tests/0/steps/2'), ['tests', '0', 'steps', '2']);
assert.deepEqual(segments('tests.0.steps.2'), ['tests', '0', 'steps', '2']);
assert.deepEqual(segments('$.tests[0]["steps"]'), ['tests', '0', 'steps']);
assert.deepEqual(parseError('tests[0].steps[2]: unknown key `foo`.').field, ['tests', '0', 'steps', '2', 'foo']);
assert.deepEqual(parseError('unknown key `inputs`. Did you mean `input`?').field, ['inputs']);
assert.deepEqual(parseError('logLevel: must be one of silent (got "x").').field, ['logLevel']);
assert.deepEqual(parseError("It isn't valid JSON or YAML.").field, []);
{
  const err = parseError('tests[0].steps[1]: unknown action `action`.');
  assert.equal(names('`tests[0].steps[1]`: unknown action `action`.', err), true);
  assert.equal(names('/tests/0/steps/1/action is not an action', err), true);
  assert.equal(names('tests[0].steps[1] is wrong', err), false);
  assert.equal(names('`tests[0].steps[0]`: unknown action `action`.', err), false);
  const root = parseError('unknown key `logLevel`.');
  assert.equal(names('- logLevel: unknown key', root), true);
  assert.equal(names('- loglevel: unknown key', root), false);
}
assert.deepEqual(reportPaths('see https://docs.doc-detective.com and tests/login.spec.json').filter(p => p.segs[0] === 'tests'), []);
assert.deepEqual(extraPaths('- `tests[0].steps[1]`: bad. Use `tests[0].steps[1].goTo`.', [parseError('tests[0].steps[1]: unknown action `action`.')], new Set(['tests'])), []);
assert.deepEqual(extraPaths('- `tests[0].steps[2].find`: bad.', [parseError('tests[0].steps[1]: unknown action `action`.')], new Set(['tests'])), ['tests[0].steps[2].find']);
assert.deepEqual(markers('Validation PASSED, then **Validation FAILED**'), [true, false]);
assert.deepEqual(markers('It was not validated, so there is no `Validation PASSED`.'), []);
assert.deepEqual(markers("I didn't run the tests.\n\nValidation PASSED"), [true]);

const cases = await loadCases();
let bad = 0, i = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (i < cases.length) {
    const c = cases[i++];
    let out;
    try { out = await check(c); } catch (err) { out = `FAIL ${c.id}: ${err.stack ?? err.message}`; }
    if (out.startsWith('FAIL')) bad++;
    console.log(out);
  }
}));
console.log(`${cases.length - bad} of ${cases.length} cases ok (${verdicts.size} judge calls)`);
// Exit only once stdout drains, so a piped log keeps the last lines.
await new Promise(r => process.stdout.write('', r));
process.exit(bad ? 1 : 0);
