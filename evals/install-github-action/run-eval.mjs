#!/usr/bin/env node
// Install-github-action eval: the hooks for evals/lib/runner.mjs. See grade.mjs for the
// cases, the workspace, and the grade.
//
//   node evals/install-github-action/run-eval.mjs --flow .claude/hillclimb/install-github-action --variant baseline --model claude-sonnet-5-5 --reps 3

import { fileURLToPath } from 'node:url';
import { runEval } from '../lib/runner.mjs';

// Loaded only after the harness gate approves them: importing a module runs its top-level code.
let runClaude, buildPlugin, removeWorkspace, loadCases, makeWorkspace, collect, gradeRun;

runEval({
  runnerFile: fileURLToPath(import.meta.url),
  async loadEvalModules() {
    ({ runClaude, buildPlugin, removeWorkspace } = await import('../lib/claude-run.mjs'));
    ({ loadCases, makeWorkspace, collect, gradeRun } = await import('./grade.mjs'));
  },
  // Runs once, before the workers start, so the plugin is built once.
  async loadCases() {
    buildPlugin();
    return loadCases();
  },
  async runCase(c, ctx) {
    const ws = makeWorkspace(c);
    let run;
    try {
      run = await runClaude({ prompt: c.prompt, cwd: ws, model: ctx.model });
      // A session that ended without a final result is incomplete, not a scored attempt.
      if (run.result_subtype === 'no_result')
        throw Object.assign(new Error(`claude exited ${run.exitCode} without a final result`), { failure_class: 'incomplete' });
      const facts = collect(c, ws);
      const report = run.finalText ?? run.transcript.filter(t => t.role === 'assistant' && t.content).at(-1)?.content ?? '';
      return {
        output: report,
        model: run.model, usage: run.usage,
        stop_reason: run.result_subtype,
        transcript: [{ role: 'user', content: c.prompt }, ...run.transcript,
          { role: 'tool_result', content: `[grader] changed: ${JSON.stringify(facts.changed)}` }],
        tool_calls: run.toolCalls.length,
        num_turns: run.num_turns,
        cc_cost_usd: run.cost_usd_reported,
        facts: { ...facts, report },
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
  perfFrom: run => ({ tool_calls: run.tool_calls, turns: run.num_turns, files_changed: run.facts.changed.length, cc_cost_usd: run.cc_cost_usd }),
});
