#!/usr/bin/env node
// Specialist eval: the hooks for evals/lib/runner.mjs. See grade.mjs for the cases and the grade.
//
//   node evals/specialist/run-eval.mjs --flow .claude/hillclimb/specialist --variant baseline --model claude-sonnet-5-5 --reps 3

import { fileURLToPath } from 'node:url';
import { runEval } from '../lib/runner.mjs';

// The plugin's agent, by its plugin-qualified name. `--agent` runs the whole session as it.
const AGENT = 'doc-detective:doc-detective-specialist';

// Loaded only after the harness gate approves them: importing a module runs its top-level code.
let runClaude, buildPlugin, tempWorkspace, removeWorkspace, loadCases, gradeRun, ddCommon, ensureServers, sessionEnv;

// One server start for every worker, assigned before the first await.
let servers = null;

runEval({
  runnerFile: fileURLToPath(import.meta.url),
  async loadEvalModules() {
    ({ runClaude, buildPlugin, tempWorkspace, removeWorkspace } = await import('../lib/claude-run.mjs'));
    ({ loadCases, gradeRun, ddCommon } = await import('./grade.mjs'));
    ({ sessionEnv } = await import('../test/grade.mjs'));
    ({ ensureServers } = await import('../spec-generation/grade.mjs'));
  },
  // Runs once, before the workers start, so the plugin is built and the pinned common installed once.
  async loadCases() {
    buildPlugin();
    ddCommon();
    return loadCases();
  },
  async runCase(c, ctx) {
    await (servers ??= ensureServers());
    const ws = tempWorkspace(`specialist-${c.id}`);
    let run;
    try {
      // The pinned Doc Detective first on PATH, so a session that runs `doc-detective` gets the version the grade uses.
      run = await runClaude({ prompt: c.prompt, cwd: ws, model: ctx.model, agent: AGENT, env: sessionEnv(ws) });
      if (run.result_subtype === 'no_result')
        throw Object.assign(new Error(`claude exited ${run.exitCode} without a final result`), { failure_class: 'incomplete' });
      if (!run.init?.agents?.includes(AGENT))
        throw Object.assign(new Error(`the session didn't load ${AGENT}`), { failure_class: 'harness' });
      const answer = run.finalText ?? run.transcript.filter(t => t.role === 'assistant' && t.content).at(-1)?.content ?? '';
      const calls = run.toolCalls;
      return {
        output: answer,
        model: run.model, usage: run.usage,
        stop_reason: run.result_subtype,
        transcript: [{ role: 'user', content: c.prompt }, ...run.transcript],
        tool_calls: calls.length,
        refs_read: calls.filter(tc => tc.name === 'Read' && /references|SKILL\.md/.test(tc.input?.file_path ?? '')).length,
        web_fetches: calls.filter(tc => tc.name === 'WebFetch' || tc.name === 'WebSearch').length,
        num_turns: run.num_turns ?? null,
        cc_cost_usd: run.cost_usd_reported,
        facts: { answer },
      };
    } catch (e) {
      // A billed session keeps its model and usage on the error row, whatever failed after it.
      if (run && e && typeof e === 'object') { e.model ??= run.model; e.usage ??= run.usage; }
      throw e;
    } finally {
      removeWorkspace(ws);
    }
  },
  // No pairwise reference here.
  gradeCase: (c, run) => gradeRun(c, run.facts),
  perfFrom: run => ({ tool_calls: run.tool_calls, turns: run.num_turns, refs_read: run.refs_read, web_fetches: run.web_fetches, cc_cost_usd: run.cc_cost_usd }),
});
