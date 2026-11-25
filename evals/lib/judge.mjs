// LLM judge for a session's final report: `claude -p` on Haiku with no tools and no
// settings, against a rubric. Same call as evals/test/grade.mjs's judge, with the
// system prompt as a parameter so other evals can say what the report is about.

import { spawn } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const JUDGE_MODEL = 'claude-haiku-4-5';
const JUDGE_TIMEOUT_MS = 180_000;
const HERE = dirname(fileURLToPath(import.meta.url));

/** Ask the judge whether `report` meets `rubric`. Returns { pass, reason, model, usage, cost_usd }. */
export function judge(rubric, report, system) {
  const prompt = `Rubric:\n${rubric}\n\nReport:\n<report>\n${report}\n</report>`;
  const args = ['-p', prompt, '--model', JUDGE_MODEL, '--output-format', 'json', '--setting-sources', '',
                '--strict-mcp-config', '--tools', '', '--no-session-persistence', '--system-prompt', system];
  return new Promise((resolvePromise, reject) => {
    const child = spawn('claude', args, { cwd: HERE, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '', timedOut = false;
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    // A hung judge would hold its caller forever; one call takes seconds.
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, JUDGE_TIMEOUT_MS);
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => {
      clearTimeout(timer);
      if (timedOut) return reject(new Error(`judge timed out after ${JUDGE_TIMEOUT_MS / 1000}s`));
      let r;
      try { r = JSON.parse(out); } catch { return reject(Object.assign(new Error(`judge exited ${code}: ${(err || out).slice(0, 300)}`), { status: /overloaded|rate.?limit/i.test(err + out) ? 529 : undefined })); }
      const m = String(r.result ?? '').match(/\{[\s\S]*\}/);
      let v = {};
      try { v = JSON.parse(m?.[0] ?? '{}'); } catch {}
      const usage = r.usage ? { input_tokens: r.usage.input_tokens ?? 0, output_tokens: r.usage.output_tokens ?? 0,
        cache_read_input_tokens: r.usage.cache_read_input_tokens ?? 0, cache_creation_input_tokens: r.usage.cache_creation_input_tokens ?? 0 } : undefined;
      resolvePromise({ pass: v.verdict === 'PASS', reason: v.reason ?? String(r.result ?? '').slice(0, 200), model: JUDGE_MODEL, usage, cost_usd: r.total_cost_usd });
    });
  });
}
