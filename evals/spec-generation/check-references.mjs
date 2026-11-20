// Grade each case's reference.spec.json as if a session wrote it. A good case
// scores complete=1, and its first step alone scores complete=0.
//   EVAL_ONLY=dd-docs-runshell,web-01-home-page-tour node evals/spec-generation/check-references.mjs
// Same environment as run-eval.mjs (DD_REPO, MANNI_PREFIX, DD_NODE_DIR). Exit 1 if any case fails.

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { removeWorkspace } from '../lib/claude-run.mjs';
import { loadCases, makeWorkspace, ensureServers, findSpec, runDocDetective, gradeRun, usesServers } from './grade.mjs';

async function grade(c, write) {
  const ws = makeWorkspace(c);
  try {
    write(join(ws, 'tests', `${c.name}.spec.json`));
    const spec = findSpec(ws, c);
    const dd = spec.json ? await runDocDetective(c, ws, spec.path) : null;
    return gradeRun(c, { spec, dd });
  } finally { removeWorkspace(ws); }
}

let bad = 0;
for (const c of await loadCases()) {
  if (usesServers(c)) await ensureServers();
  const ref = join(c.cdir, 'reference.spec.json');
  const full = await grade(c, p => copyFileSync(ref, p));
  const spec = JSON.parse(readFileSync(ref, 'utf8'));
  // A single-step reference is its own one-step spec, so only multi-step ones get that check.
  const multi = spec.tests.reduce((n, t) => n + t.steps.length, 0) > 1;
  const one = multi ? await grade(c, p => writeFileSync(p, JSON.stringify({ ...spec, tests: [{ ...spec.tests[0], steps: [spec.tests[0].steps[0]] }] }))) : null;
  const ok = full.grade.complete === 1 && (!one || one.grade.complete === 0);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.id}  reference ${JSON.stringify(full.grade)}  one-step complete=${one ? one.grade.complete : 'n/a'}`);
  if (full.grade.complete !== 1) console.log(`     ${JSON.stringify(full.explanation)}`);
}
process.exit(bad ? 1 : 0);
