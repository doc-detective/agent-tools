# Install-github-action eval cases

Each case in `cases/<id>/` is a small docs repo, one git commit on `main` with an `origin`
remote on GitHub, unless the case sets `branch` or `remote`. The session gets
`/doc-detective:doc-detective-install-github-action <args>`. It should add one workflow that
runs Doc Detective the way the request and the repo need. It should touch nothing else, and
tell the user what's left to do. The session doesn't need to run Doc Detective, and the grade never
does.

| File | Purpose |
| --- | --- |
| `workspace/` | The repo the session starts in. |
| `expected.json` | The outcome the grade checks (below). |
| `reference.md` | A final report that meets the case's `report` rubric. |
| `reference/` | The workflow a right session adds, at its workspace path. Absent when nothing should be written. |

Most cases pass `--ci`, or say "write the workflow without asking me first", because a
headless session has no one to confirm with. `confirm-first` passes neither, and expects the
skill to show the workflow and ask.

## `expected.json` format

```json
{
  "kind": "feature",
  "args": "--ci --create-pr-on-change",
  "hard": "why the case is hard",
  "write": true,
  "proposal": false,
  "remote": "https://gitlab.com/acme-docs/widget-docs.git",
  "branch": "trunk",
  "allow_new": [],
  "fit": {
    "triggers": { "push": { "branches": ["main"] }, "schedule": { "hour": "2" } },
    "allow_triggers": ["push"],
    "paths": { "match": ["packages/docs/a.md"], "skip": ["packages/api/b.ts"] },
    "config": ".doc-detective.json",
    "input": ["docs"],
    "permissions": [{ "contents": "write", "pull-requests": "write" }],
    "with": { "create_pr_on_change": true, "issue_mentions": ["claude", "copilot"] },
    "without": ["integrations"],
    "steps_before": [["\\bnpm (?:ci|install)\\b"], ["npm run dev\\b.*&\\s*$"]],
    "env": { "API_KEY": "API_KEY" },
    "artifact": { "path": [".doc-detective/runs"] },
    "runs_on": "^macos"
  },
  "must_mention": ["create and approve pull requests"],
  "report": "rubric for the judge",
  "wrong_report": "a report that misses the rubric",
  "wrong": [
    { "why": "what the bad outcome does", "fails": "fit", "base": "original",
      "replace": [{ "file": ".github/workflows/doc-detective.yml", "from": "old", "to": "new" }],
      "write": { "path": "text" }, "report": "a report to grade instead of reference.md" }
  ]
}
```

- `args`: what follows the slash command: flags, free text, or both.
- `write`: `true` when the session must add exactly one workflow, `false` when it must add none, `"optional"` when adding one or asking first both work.
- `proposal`: on a `write: false` case, the report must show the workflow it would add, in a `yaml` block. The grade checks that block as it would a written file.
- `remote` and `branch`: the `origin` remote (`null` for none) and the branch name. The defaults are `https://github.com/acme-docs/widget-docs.git` and `main`.
- `allow_new`: files outside `.github/workflows/` the session may add. Every case leaves it empty.
- `fit`: what the workflow must do. Every key is optional.
  - `triggers`: the events it must have. `push` and `pull_request` can require `branches`; `schedule` can require cron fields by name (`minute`, `hour`, `dom`, `month`, `dow`), and `{}` takes any cron. Events outside `triggers`, `allow_triggers`, and `workflow_dispatch` fail.
  - `paths`: every `push` or `pull_request` trigger must run for each `match` file and skip each `skip` file, by its `paths` or `paths-ignore` filters.
  - `config` and `input`: the Doc Detective config the action resolves, and the paths it may test. The config is `working_directory` joined with `config`, or the `.doc-detective.*` it finds there, or `null` for none. The paths are the action's `input`, else the config's `input`, else `working_directory`. A `config`, `input`, or `working_directory` that names a missing path fails.
  - `permissions`: the accepted token permission sets, matched exactly at the job or workflow level. The default is `[{ "contents": "read" }]`.
  - `with` and `without`: action inputs that must have these values (a list means a comma-separated set), and inputs that must be absent.
  - `steps_before`: for each entry, some step before the action whose `run` (or `uses`) matches one of its regexes.
  - `env`: environment variables the action step gets from `secrets.<name>`, set on the step, the job, or the workflow.
  - `artifact`: an `actions/upload-artifact@v4` step after the action, with `include-hidden-files: true`, `if: always()` (or `!cancelled()`, `failure()`), and a `path` in this list.
  - `runs_on`: a regex for the job's `runs-on`.
- `must_mention`: strings the final report must contain (case-insensitive) before the judge is asked. An array entry matches any of its strings. Write cases default to `.github/workflows/`.
- `report`: the judge's rubric for the final report.
- `wrong_report` and `wrong`: bad outcomes [check-references.mjs](check-references.mjs) proves the grade rejects. A `wrong` entry starts from the reference files (or from the original workspace with `"base": "original"`), applies its first-match replacements and whole-file writes, and grades `report` or `reference.md`. The result must score `complete` 0 with its `fails` metric 0.

## Metrics

| Metric | 1 when |
| --- | --- |
| `workflow` | Exactly one new file under `.github/workflows/` (none on a `write: false` case; at most one on `"optional"`). It parses as YAML and is a valid workflow. That means known events and a `cron` list for `schedule`. It also means jobs with `runs-on` and steps, each step with one of `uses` and `run`, and valid permission scopes. Its `doc-detective/github-action` step sets only inputs in [action-inputs.json](action-inputs.json), none deprecated, each a scalar; boolean inputs are `true` or `false`, and `issue_mentions` names supported tools. When `actionlint` is on `PATH` (or `ACTIONLINT` names it), it must pass too. |
| `fit` | The action is pinned (`@v2`, `@v2.x.y`, or a commit), after `actions/checkout` and `actions/setup-node` with Node.js 24, and the workflow meets the case's `fit`. 1 on a `write: false` case with no `proposal`. |
| `no_harm` | No existing file changed or deleted, and nothing added outside `.github/workflows/` (nothing at all on a `write: false` case). Files under `.doc-detective/` and `node_modules/` don't count, and neither does a Doc Detective results file: JSON with `specs` and `summary`, or a JSON named like `results*.json` or `testResults*.json`. |
| `report` | The final report has every `must_mention` string, and the judge (`claude-haiku-4-5`) says it meets the `report` rubric. On write cases, the rubric asks what was added, what triggers it, and what the user must still do. That's to commit and push it, confirm GitHub Actions is enabled, and add any secret or setting the case needs. |
| `complete` | All four. |

[action-inputs.json](action-inputs.json) is the inputs list of `doc-detective/github-action`'s `action.yml` at commit `6230ca8e35c1f374e3cd817b2ecdf5c199d48b11` (main, 2026-11-22). Its `action.yml` matches `v2.2.1`, which `v2` points to. Update it, and its `source` line, when the action's inputs change.

## Cases

| id | kind | args | what makes it hard |
| --- | --- | --- | --- |
| basic-root-config | basic | `--ci` | The simplest repo, with a config at the root and docs in docs/. The temptations are extra write permissions, extra features, and an unpinned ref. |
| build-then-serve | setup | `--ci` | The tests check the built site: `npm run build`, then `npm run preview` on :4321, in that order, with the server in the background. |
| config-in-docs-subdir | config | `--ci` | The config is docs/.doc-detective.json. `config` resolves against `working_directory`. So `working_directory: docs` with `config: docs/.doc-detective.json` names a file that doesn't exist. With neither set, the action finds no config. |
| config-yaml | config | `--ci` | The config is YAML (`.doc-detective.yaml`); every example in the skill says `.doc-detective.json`. |
| confirm-first | confirm | (none) | No `--ci` and no go-ahead: the skill says show the workflow and wait. A headless session that writes it anyway skips the user's review. |
| create-pr-on-change | feature | `--ci --create-pr-on-change` | With no `--trigger`, PR creation moves the trigger to push on the default branch. It needs two write permissions, and a repository setting the file can't change. |
| create-pr-on-pull-request | feature | `--ci --create-pr-on-change --trigger pull_request` | The user asked for pull_request. The skill keeps it, but must warn that the PR carries the source PR's changes and that every source PR overwrites one branch. |
| custom-token-secret | feature | `--ci --create-issue-on-fail Use our DOCS_BOT_TOKEN repository secret as the token when it creates issues.` | The input is `token`, and its value a `secrets.` expression; `github_token` is the name other actions use. |
| dev-server | setup | `--ci` | The doc tests open http://localhost:5173, which answers only after `npm run dev`. The skill's template has no setup step, and `npm run dev` in the foreground never returns. |
| existing-dd-yml-ask | existing | `Set up Doc Detective to run on pull requests. Write the workflow without asking me first.` | The user said not to ask, but the default filename belongs to another workflow. Writing under a new name or asking first both work; overwriting needs consent the user didn't give. |
| existing-dd-yml-ci | existing | `--ci` | .github/workflows/doc-detective.yml already exists and labels pull requests; the skill's default filename is taken. With `--ci` the skill writes `doc-detective-<timestamp>.yml`. |
| existing-docs-workflow | existing | `--ci` | A docs build workflow already runs on pull requests. Adding a Doc Detective job to it looks tidy, and changes a file the user didn't ask to change. |
| gitlab-decline | decline | `--ci` | A docs repo with a Doc Detective config is the skill's home turf, and `--ci` says don't ask. Only the remote and .gitlab-ci.yml say it's GitLab. |
| input-subfolder | config | `--ci Only test the tutorials in docs/tutorials in CI, not the rest of the docs.` | The shared config tests all of docs/. The action's `input` narrows CI to docs/tutorials; editing the config instead changes everyone's local runs. |
| ios-macos | setup | `--ci` | The tests run on iOS, which needs a macOS runner; the template says ubuntu-latest. An older action branch had an `ios` input; v2 doesn't. |
| issue-on-fail-integrations | feature | `--ci --trigger push --create-issue-on-fail --integrations claude,copilot` | The skill's flag is `--integrations`, but the input is `issue_mentions`; `integrations` is still in action.yml, deprecated. Issue creation needs `issues: write`. |
| monorepo-path-filter | filter | `--ci Only run it when something in the docs package changes.` | The docs are one package of three. The path filter must cover packages/docs/ and nothing else, and the config is two folders down. |
| nightly-schedule | trigger | `--ci Run the doc tests every night at 2 AM UTC.` | The skill suggests `0 6 * * 1`, Monday mornings; the request is every night at 2 AM UTC. |
| no-config-documentation-dir | config | `--ci` | No Doc Detective config, and the docs are in documentation/, not docs/. A `config` input names a file that doesn't exist. |
| no-config-root-docs | config | `--ci` | The repo has no config and no docs folder. The tested Markdown sits at the repository root, so the input is the root, not an invented docs/. |
| no-exit-on-fail | feature | `--ci --no-exit-on-fail` | `continue-on-error` also turns the check green, and hides that the step failed; the action has its own `exit_on_fail` input. |
| nvmrc-node20 | setup | `--ci` | The repo pins Node.js 20 in .nvmrc for its site build. Doc Detective 5 needs Node.js 24, so reusing `node-version-file: .nvmrc` breaks the run. |
| pin-version | feature | `--ci Pin Doc Detective itself to version 5.6.3 so CI doesn't change under us.` | Both the action (`@v2`) and Doc Detective (`version`) have versions. Pinning the action's ref to 5.6.3, or giving a range, misses. |
| pr-comment-request | feature | `--ci Also post the test results as a comment on each pull request.` | The action has no PR-comment input. An invented one (`comment_on_pr`) only draws a warning from GitHub, so the comment silently never appears. |
| pr-only | trigger | `Run the doc tests on pull requests only, not on pushes. Write the workflow without asking me first.` | The skill's report says to suggest a `push` trigger for the cache. Suggesting it is fine; adding it goes against the request. |
| push-default-branch-trunk | trigger | `--ci Run Doc Detective on every push to our default branch.` | The default branch is `trunk`, not `main`, and only `git` says so. |
| push-main | trigger | `--ci --trigger push Run it on every push to main.` | `--trigger push` alone runs on every branch; the request names `main`. |
| run-locally-route | route | `I just want to run my doc tests on my laptop right now and see what fails.` | The request comes through the CI skill's command but asks for a local run. Any workflow it writes is unwanted. |
| schedule-default | trigger | `--ci --trigger schedule` | `schedule` needs a list of `cron` entries, not a bare event, and with `--ci` there's no one to ask for the time. |
| secret-env | feature | `--ci` | The request doesn't mention secrets. The doc's test reads `$API_KEY`, which CI has only if the workflow passes it from a secret, and the action has no input for it. |
| upload-artifacts | feature | `--ci Keep each run's screenshots and results as a downloadable artifact, even when tests fail.` | The run folder starts with a dot, so upload-artifact skips it without `include-hidden-files: true`, and a failing test skips later steps without `if: always()`. |
| upload-artifacts-subdir | feature | `--ci Upload the screenshots from each run as an artifact.` | With the config in docs/, the run folder is docs/.doc-detective/runs/. upload-artifact paths are relative to the repository root, not `working_directory`. |

By kind: 10 `feature`, 5 `config`, 5 `trigger`, 4 `setup`, 3 `existing`, and one each of `basic`, `filter`, `decline`, `route`, and `confirm`. 29 write a workflow (one optionally); 3 must write nothing.
