// Grade each case's reference.<ext> and three outputs that must not pass. No model calls.
//   EVAL_ONLY=md-spec-sample,rst-gen-cli node evals/inline/check-references.mjs
// A good case: the reference scores complete=1 with placement=1; the unchanged doc and the
// doc with one bogus step comment score complete=0; the reference with one prose line
// edited scores comment_only=0; and the reference's comments all moved to the top of the
// file score placement below 1. Exit 1 if any case fails.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCases, dryRun, gradeRun, commentOnly } from './grade.mjs';

const BOGUS = '{"find":"Text no case expects"}';
const bogusLine = { '.mdx': `{/* step ${BOGUS} */}`, '.adoc': `// (step ${BOGUS})`, '.rst': `.. step ${BOGUS}\n` };

async function grade(c, text) { return gradeRun(c, { text, dry: await dryRun(c, text) }); }

async function check(c) {
  const original = readFileSync(join(c.cdir, c.docFile), 'utf8');
  const ref = readFileSync(join(c.cdir, `reference${c.ext}`), 'utf8');
  const lines = ref.replace(/\r\n/g, '\n').split('\n');
  const { added } = commentOnly(original, ref, c.ext);
  const prose = lines.findIndex((l, k) => !added[k] && /[a-z]/i.test(l));
  const edited = lines.map((l, k) => k === prose ? `${l} Edited.` : l).join('\n');
  const top = [...lines.filter((_, k) => added[k]), ...lines.filter((_, k) => !added[k])].join('\n');
  const [full, same, bogus, edit, moved] = await Promise.all([ref, original, `${bogusLine[c.ext] ?? `<!-- step ${BOGUS} -->`}\n${original}`, edited, top].map(t => grade(c, t)));
  const ok = full.grade.complete === 1 && full.grade.placement === 1 && same.grade.complete === 0
    && bogus.grade.complete === 0 && edit.grade.comment_only === 0 && moved.grade.placement < 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.id}  reference ${JSON.stringify(full.grade)}  unchanged=${same.grade.complete} bogus=${bogus.grade.complete} edited.comment_only=${edit.grade.comment_only} moved.placement=${moved.grade.placement}`);
  if (full.grade.complete !== 1 || full.grade.placement !== 1) console.log(`     ${JSON.stringify(full.explanation)}`);
  return ok;
}

let bad = 0;
for (const c of await loadCases()) if (!(await check(c))) bad++;
process.exit(bad ? 1 : 0);
