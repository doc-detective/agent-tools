#!/usr/bin/env node
// Test eval runner: the hooks for evals/lib/runner.mjs, which owns the CLI and the loop.
//
//   node evals/test/run-eval.mjs --flow .claude/hillclimb/test --variant baseline --model claude-sonnet-5-5

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runEval } from '../lib/runner.mjs';

// --- fill these in ----------------------------------------------------------
//
// Test eval: see grade.mjs for the cases, the workspace, and the grade.

// The eval's modules load only after checkHarness approves them (see main): importing a
// module runs its top-level code, and grade.mjs and claude-run.mjs are harness paths.
let runClaude, buildPlugin, removeWorkspace, loadTestCases, makeWorkspace, checkDown, collect, gradeRun, ensureServers, sessionEnv;
async function loadEvalModules() {
  ({ runClaude, buildPlugin, removeWorkspace } = await import('../lib/claude-run.mjs'));
  ({ loadCases: loadTestCases, makeWorkspace, checkDown, collect, gradeRun, sessionEnv } = await import('./grade.mjs'));
  ({ ensureServers } = await import('../spec-generation/grade.mjs'));
}

// --- run (hooks) --------------------------------------------------------------------

// loadCases runs once, before the workers start, so the plugin is built once here:
// a build per worker would race on the output folders.
async function loadCases() {
  buildPlugin();
  return loadTestCases();
}

// One server start for every worker: assigned before the first await, so workers that
// start together share it instead of each spawning servers on the same ports.
let servers = null;

async function runCase(c, ctx) {
  await (servers ??= ensureServers());
  await checkDown(c);
  // The server start and the check can outlast the case's ceiling; don't bill a session after it.
  if (Date.now() >= ctx.deadline) throw Object.assign(new Error('wall-clock ceiling exceeded before the session started'), { failure_class: 'timeout' });
  const ws = makeWorkspace(c);
  let run;
  try {
    try {
      // The pinned Doc Detective and its Node first on PATH; an npm prefix of the workspace's own.
      const env = sessionEnv(ws);
      run = await runClaude({ prompt: c.prompt, cwd: ws, model: ctx.model, env });
      // A session that ended without a final result is incomplete, not a scored attempt.
      if (run.result_subtype === 'no_result')
        throw Object.assign(new Error(`claude exited ${run.exitCode} without a final result`), { failure_class: 'incomplete' });
      const facts = await collect(c, ws, run.toolCalls);
      // The final message is the report; a session the eval stopped has none, so take its last words.
      const report = run.finalText ?? run.transcript.filter(t => t.role === 'assistant' && t.content).at(-1)?.content ?? '';
      return {
        output: report,
        model: run.model, usage: run.usage,
        stop_reason: run.result_subtype,
        transcript: [{ role: 'user', content: c.prompt }, ...run.transcript,
          { role: 'tool_result', content: `[grader] changed: ${JSON.stringify(facts.changed)}; rerun exit ${facts.rerun.code}: ${JSON.stringify(facts.rerun.tests)}` }],
        tool_calls: run.toolCalls.length,
        num_turns: run.num_turns,
        cc_cost_usd: run.cost_usd_reported,
        facts: { ...facts, report },
      };
    } finally {
      removeWorkspace(ws);
    }
  } catch (e) {
    // A billed session keeps its model and usage on the error row, whatever failed after it.
    if (run && e && typeof e === 'object') { e.model ??= run.model; e.usage ??= run.usage; }
    throw e;
  }
}

// No pairwise reference here, so `ref` and `ctx` go unused.
async function gradeCase(c, run, _ref, _ctx) { return gradeRun(c, run.facts); }

/** Side-channel perf fields beyond the built-ins (latency_s etc.). */
function perfFrom(run) {
  // cc_cost_usd: Claude Code's own cost figure for the session, a cross-check on the cost derived from usage.
  return { tool_calls: run.tool_calls, turns: run.num_turns, dd_runs: run.facts.dd_runs, files_changed: run.facts.changed.length, cc_cost_usd: run.cc_cost_usd };
}

runEval({ runnerFile: fileURLToPath(import.meta.url), loadEvalModules, loadCases, runCase, gradeCase, perfFrom });
