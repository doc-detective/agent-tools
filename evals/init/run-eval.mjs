#!/usr/bin/env node
// Init eval runner: the hooks for evals/lib/runner.mjs, which owns the CLI and the loop.
// See grade.mjs for the cases, the workspace, and the grade.
//
//   node evals/init/run-eval.mjs --flow .claude/hillclimb/init --variant baseline --model claude-sonnet-5-5 --reps 3

import { join } from 'node:path';
import { runEval } from '../lib/runner.mjs';

// The eval's modules load only after the harness check approves them: importing a module
// runs its top-level code, and grade.mjs and claude-run.mjs are harness paths.
let runClaude, buildPlugin, removeWorkspace, loadInitCases, makeWorkspace, checkDown, collect, gradeRun, ensureServers, toolEnv;
async function loadEvalModules() {
  ({ runClaude, buildPlugin, removeWorkspace } = await import('../lib/claude-run.mjs'));
  ({ loadCases: loadInitCases, makeWorkspace, checkDown, collect, gradeRun } = await import('./grade.mjs'));
  ({ ensureServers, toolEnv } = await import('../spec-generation/grade.mjs'));
}

// Runs once, before the workers start, so the plugin is built once.
async function loadCases() {
  buildPlugin();
  return loadInitCases();
}

// One server start for every worker, assigned before the first await.
let servers = null;

async function runCase(c, ctx) {
  await (servers ??= ensureServers());
  await checkDown(c);
  if (Date.now() >= ctx.deadline) throw Object.assign(new Error('wall-clock ceiling exceeded before the session started'), { failure_class: 'timeout' });
  const ws = makeWorkspace(c);
  let run;
  try {
    try {
      // Doc Detective's Node first on PATH; an npm prefix of its own, so a global install stays in the workspace.
      const env = { ...toolEnv(), npm_config_prefix: join(ws, '.npm-global') };
      run = await runClaude({ prompt: c.prompt, cwd: ws, model: ctx.model, env });
      if (run.result_subtype === 'no_result')
        throw Object.assign(new Error(`claude exited ${run.exitCode} without a final result`), { failure_class: 'incomplete' });
      const facts = await collect(c, ws, run.toolCalls);
      const report = run.finalText ?? run.transcript.filter(t => t.role === 'assistant' && t.content).at(-1)?.content ?? '';
      return {
        output: report,
        model: run.model, usage: run.usage,
        stop_reason: run.result_subtype,
        transcript: [{ role: 'user', content: c.prompt }, ...run.transcript,
          { role: 'tool_result', content: `[grader] changed: ${JSON.stringify(facts.changed)}; config: ${facts.config.path ?? 'none'}; run exit ${facts.run?.code}: ${JSON.stringify(facts.run?.tests.map(t => [t.id, t.result]) ?? [])}` }],
        tool_calls: run.toolCalls.length,
        num_turns: run.num_turns,
        cc_cost_usd: run.cost_usd_reported,
        facts: { ...facts, report },
      };
    } finally {
      removeWorkspace(ws);
    }
  } catch (e) {
    if (run && e && typeof e === 'object') { e.model ??= run.model; e.usage ??= run.usage; }
    throw e;
  }
}

// The runner also passes `ref` and `ctx`. Init grades each run on its own, with no pairwise reference.
async function gradeCase(c, run) { return gradeRun(c, run.facts); }

function perfFrom(run) {
  return { tool_calls: run.tool_calls, turns: run.num_turns, dd_runs: run.facts.dd_runs, files_changed: run.facts.changed.length, cc_cost_usd: run.cc_cost_usd };
}

runEval({ loadEvalModules, loadCases, runCase, gradeCase, perfFrom });
