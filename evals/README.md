# Evals

Two evals measure the plugin the way users meet it: through Claude Code, with only this plugin loaded. Each run rebuilds `plugins/doc-detective/` from `src/` first, so an edit to a skill is what gets measured.

| Eval | Question it answers | Headline metric |
|---|---|---|
| [routing](routing/) | Does a request reach the one skill or agent that owns it? | `correct`: the case's preferred route fired |
| [spec-generation](spec-generation/) | Does `/doc-detective-generate` turn a doc into a spec that runs and covers the doc? | `complete`: the spec passes and has every expected step |

Results go to `.claude/hillclimb/<eval>/<variant>/`, one directory per variant (`baseline`, `v1`, `v2`, and so on). `_state.json` in each eval's directory declares its metrics and the files whose hash the runner checks before it spends anything.

## Requirements

- The `claude` CLI, signed in. Runs are billed to that account.
- Node.js 22.22.2 or later, 24.15 or later, or 26.12.1 or later. Doc Detective 5.6's Appium refuses older versions, so on an older default Node, point `DD_NODE_DIR` at a newer one.
- `npm ci` in this repository.

## Run the routing eval

```bash
node evals/routing/run-eval.mjs --flow .claude/hillclimb/routing --variant baseline --model claude-sonnet-5-5 --reps 2
```

Each case is a request from [routing/cases.json](routing/cases.json), sent with `claude -p` in a fresh copy of one of the [fixture workspaces](routing/workspaces/). The runner passes `--setting-sources ""` so your own plugins and settings don't load, and it turns off tools that write files or reach the network. It stops the session at the first routing decision: a Skill call, a Doc Detective agent call, or eight tool calls with neither.

[routing/cases.md](routing/cases.md) lists every case with its preferred route. `lenient` also counts the case's other accepted routes, and `fired` is whether any Doc Detective route fired, which shows false triggers on the `none` cases.

## Run the spec-generation eval

```bash
DD_REPO=<doc-detective checkout> MANNI_PREFIX=<npm prefix> MANNI_VERSION=2.6.0 \
  node evals/spec-generation/run-eval.mjs --flow .claude/hillclimb/spec-generation --variant baseline --model claude-sonnet-5-5
```

Each case runs `/doc-detective:doc-detective-generate <page> --output tests/<id>.spec.json` in a fresh workspace. The runner then runs the spec it wrote with `doc-detective@5.6.0`. That's what `doc-detective@5` resolves to, so the session's own runs and the grade agree. The grade compares the spec's steps with the case's `expected.json`, one generated step per expected step. A spec that only opens the page passes but covers almost nothing, so `complete` needs both.

A case's `workspace/` folder, when it has one, is the repo the session starts in: the files, folders, and config the page names. The runner adds the page and an empty `tests/` (with a `.gitkeep`). For manni and dd-docs it makes the result one git commit, so no history holds the page's original tests. Doc Detective runs from the workspace root with [doc-detective.config.json](spec-generation/doc-detective.config.json) layered over the workspace's `.doc-detective.json`, if the session wrote one. A session can register an OpenAPI description there, as a user would. `relativePathBase` keeps its default, so relative paths in a spec resolve against the spec file, unless the session's own config sets it.

There are three slices:

- **web** ([spec-generation/cases/](spec-generation/cases/)): 33 how-to docs for the pages on Doc Detective's test server. `DD_REPO` is a [doc-detective](https://github.com/doc-detective/doc-detective) checkout with `npm ci` done. The runner starts its test servers (ports 8092 and 8093) when they aren't already up.
- **manni** ([spec-generation/cases-manni/](spec-generation/cases-manni/)): 31 manni docs pages with their inline tests removed, each in a small repo that holds what the page names. `original.mdx` keeps the page as it was. The manni CLI is a build of commit `3a8b3d51399c4bac38021656b338af0f57376e88`, linked into an npm prefix. Set it up once:

  ```bash
  git clone <manni repo> manni && cd manni
  git checkout 3a8b3d51399c4bac38021656b338af0f57376e88
  npm ci && npm run build
  npm_config_prefix="$PWD/../npm-global" npm link
  ```

  Then set `MANNI_PREFIX` to the `npm-global` directory, and `MANNI_VERSION` to the build's version (`2.6.0`). The grade puts that prefix's bin first on `PATH`, so `manni` runs that build. It also sets `npm_config_prefix` to it, which is where `npx @hawkeyexl/manni` looks for the package. The model's session gets the same `PATH` but its own npm prefix in the workspace. That prefix links the same build, so the session's `npx @hawkeyexl/manni` runs it too. A page that tells the reader to `npm install -g` then installs into the workspace, not over the build the grade uses. Before grading each manni case, the runner checks `manni --version` against `MANNI_VERSION` and records the case as an error, not a score, on a mismatch.
- **dd-docs** ([spec-generation/cases-dd-docs/](spec-generation/cases-dd-docs/)): 9 pages from Doc Detective's own docs with their inline tests removed. They run against the shell and the test servers. Two call `python` and `bash`, so both must be on `PATH`.

[spec-generation/cases.md](spec-generation/cases.md), [spec-generation/cases-manni.md](spec-generation/cases-manni.md), and [spec-generation/cases-dd-docs.md](spec-generation/cases-dd-docs.md) describe every case. Each case's `reference.spec.json` passes and covers every expected step, so it scores `complete`. When the reference has more than one step, its first step alone scores 0. Check that with `node evals/spec-generation/check-references.mjs`, which takes the same environment and `EVAL_ONLY` as the eval.

## Run a subset

`EVAL_ONLY` takes a comma-separated list of case ids, for a pilot or a trimmed slice:

```bash
EVAL_ONLY=init-plain,neg-playwright node evals/routing/run-eval.mjs --flow .claude/hillclimb/routing --variant baseline --model claude-sonnet-5-5
```

Spec-generation case ids carry their slice: `web-01-home-page-tour`, `manni-cite-ci`, `dd-docs-runshell`.

## Approve changed eval code

The runner refuses to start when the runner, `evals/lib/claude-run.mjs`, the files in `_state.json`'s `harness_paths`, or `package-lock.json` changed since someone last approved them. That stops edited eval code from running unreviewed. After you review the change, run once with `--approve-harness` to record the new hash.

## Read the results

Build the report from the flow directory with the eval report builder that ships with the `/claude-api` skill (`build-report-lite.mjs`):

```bash
node <claude-api skill>/shared/evals/report/build-report-lite.mjs .claude/hillclimb/routing/
```

It writes `report.html`, a per-case table with links to each transcript. Transcripts, reports, and frozen references stay out of git.
