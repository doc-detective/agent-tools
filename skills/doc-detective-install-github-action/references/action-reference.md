# Doc Detective GitHub Action Reference

Complete reference for `doc-detective/github-action@v2`. Use this to configure workflow files without needing to fetch external documentation.

## Action Inputs

| Input | Description | Default |
|---|---|---|
| `version` | The Doc Detective version, range, or npm tag to install. `""` runs the `doc-detective` already resolvable in the working directory. | `5` |
| `working_directory` | Directory to run Doc Detective and its `git` commands in, relative to the repo root. `config` and `input` resolve against it. | `.` (repo root) |
| `android` | Set up KVM for the Android emulator on Linux runners: `auto` (only when a spec has an `android` platform), `true`, or `false` | `auto` |
| `config` | Path to Doc Detective config file, relative to `working_directory` | (auto-detected: `.doc-detective.json`, `.yaml`, or `.yml`) |
| `input` | Input file or directory to test, relative to `working_directory` | (from config) |
| `exit_on_fail` | Fail the job if any test fails. Set to `false` to report failures without failing the job. The job still fails when nothing valid was tested. | `true` |
| `create_pr_on_change` | Open or update a pull request if files change during execution (e.g., updated screenshots). The PR targets the base branch of the triggering PR (`GITHUB_BASE_REF`). Otherwise it targets the branch that triggered the run (`GITHUB_REF_NAME`). | `false` |
| `pr_branch` | Branch for the PR. Each run resets it to the checked-out commit plus that run's changes and force-pushes it. The action then updates the branch's open PR, or opens one. Don't commit to it by hand. | `doc-detective-changes` |
| `pr_paths` | Comma-separated paths to commit to the PR, relative to `working_directory`. Only changes under these paths open a PR. For example, `docs/images`. | (every changed file, including captured screenshots) |
| `pr_title` | Title for the created PR | `Doc Detective Changes` |
| `pr_body` | Body text for the created PR | (default message) |
| `pr_labels` | Comma-separated labels for the created PR | `doc-detective` |
| `pr_assignees` | Comma-separated assignees for the created PR | (none) |
| `pr_reviewers` | Comma-separated reviewers for the created PR | (none) |
| `create_issue_on_fail` | Create a GitHub issue when tests fail. If an open issue has the same `issue_title` and the first label in `issue_labels`, the action replaces that issue's body instead of opening another. | `false` |
| `issue_title` | Title for the created issue | `Doc Detective Failure` |
| `issue_body` | Body text for the created issue. `$SUMMARY` inserts the run's Markdown summary (`testResults.md` in the run folder), `$RESULTS` the results as JSON, `$RUN_URL` the workflow run URL, and `$PROMPT` the `issue_prompt` text. | `A Doc Detective run ($RUN_URL) failed:`, a blank line, then `$SUMMARY` |
| `issue_labels` | Comma-separated labels for the created issue | `doc-detective` |
| `issue_assignees` | Comma-separated assignees for the created issue | (none) |
| `issue_mentions` | Comma-separated tools to mention in issues. Replaces the deprecated `integrations`. | (none) |
| `issue_prompt` | Text that follows each mention. Replaces the deprecated `prompt`. | `Investigate potential causes of the failures reported in this Doc Detective test output and suggest fixes.` |
| `token` | GitHub token for API operations (PR/issue creation) | `${{ github.token }}` |

## Action Outputs

| Output | Description |
|---|---|
| `results` | JSON string of Doc Detective test results |
| `pull_request_url` | URL of the created or updated PR (if `create_pr_on_change` triggered) |
| `issue_url` | URL of the created or updated issue (if `create_issue_on_fail` triggered) |

## Required Permissions by Feature

### Base (run tests only)

```yaml
permissions:
  contents: read
```

### PR creation (`create_pr_on_change: true`)

```yaml
permissions:
  contents: write
  pull-requests: write
```

The action needs `contents: write` to force-push `pr_branch` and `pull-requests: write` to open or update the PR.

### Issue creation (`create_issue_on_fail: true`)

```yaml
permissions:
  contents: read
  issues: write
```

### All features enabled

```yaml
permissions:
  contents: write
  pull-requests: write
  issues: write
```

## Platform Limitations

- **Node.js 24.15 or later.** `npx` runs Doc Detective 5 on the job's Node.js, not the action's own runtime. Add `actions/setup-node` with `node-version: 24` before the action, as every template below does. On older Node.js, the action logs a warning and runs anyway.
- **Headless browsers on Ubuntu.** Ubuntu runners have no display, so Chrome and Firefox run headless. Doc Detective records headless Chrome, but not headless Firefox. To run headed or record Firefox, install Xvfb, or use a `macos-latest` or `windows-latest` runner.
- **Default token scope.** The default `GITHUB_TOKEN` can create PRs and issues within the same repository. For cross-repo operations or repos with strict token policies, a custom `token` input may be required.

## Run Files and Secrets

By default, Doc Detective takes a screenshot after every step that drives a browser, app, or device. It also records each such context when the runner can. The action writes only the results file, which sets the `results` output, to `${{ runner.temp }}`. Doc Detective writes the rest under the config's `outputDir`: the run folder, `.doc-detective/runs/<runId>/`, which holds these captures and the run's summary, and reports such as `junit.xml`.

The action adds `.doc-detective/`, `junit.xml`, `doc-detective-summary.md`, and `testResults-*` to the checkout's `.git/info/exclude`, so they stay out of `create_pr_on_change` pull requests. An image a `screenshot` step saves isn't excluded, so an updated image reaches the PR. Set `pr_paths` to limit what the PR commits.

To keep the run folder after the job, upload it in a later step. Give `path` relative to the repo root. This example assumes the config sits at the repo root and sets no `outputDir`. With `working_directory: docs`, the path is `docs/.doc-detective/runs/`. `upload-artifact` skips files in folders whose names start with `.` unless `include-hidden-files` is `true`:

```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: doc-detective-run
    path: .doc-detective/runs/
    include-hidden-files: true
```

Doc Detective masks the values of variables it uses, such as `$API_TOKEN`, as `***NAME***` in logs, results, and the issues the action creates. Pass secrets to the job as environment variables, and reference them as `$NAME` in specs.

## Issue Mentions

The `issue_mentions` input accepts a comma-separated list of AI tool identifiers. When `create_issue_on_fail` is enabled, the action mentions these tools in the issue body so they can automatically respond.

Supported identifiers:
- `doc-sentinel` — Doc Detective's own monitoring bot
- `promptless` — Promptless AI assistant
- `dosu` — Dosu AI assistant
- `claude` — Anthropic Claude (via GitHub integration)
- `opencode` — OpenCode AI assistant
- `copilot` — GitHub Copilot
- `cursor` — Cursor AI editor

## Workflow Templates

### Minimal — test on PRs

```yaml
name: Doc Detective

on:
  pull_request:

permissions:
  contents: read

jobs:
  doc-detective:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: doc-detective/github-action@v2
```

### With PR creation for file changes

```yaml
name: Doc Detective

on:
  pull_request:

permissions:
  contents: write
  pull-requests: write

jobs:
  doc-detective:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: doc-detective/github-action@v2
        with:
          create_pr_on_change: true
          pr_labels: doc-detective,automated
          pr_reviewers: octocat
```

### With issue creation and AI integrations

```yaml
name: Doc Detective

on:
  push:
    branches: [main]

permissions:
  contents: read
  issues: write

jobs:
  doc-detective:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: doc-detective/github-action@v2
        with:
          create_issue_on_fail: true
          issue_labels: doc-detective,test-failure
          issue_mentions: claude,copilot
```

### Scheduled nightly run with all features

```yaml
name: Doc Detective (Nightly)

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
  workflow_dispatch:       # Allow manual trigger

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  doc-detective:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: doc-detective/github-action@v2
        with:
          create_pr_on_change: true
          pr_labels: doc-detective,nightly
          create_issue_on_fail: true
          issue_labels: doc-detective,nightly-failure
          issue_mentions: claude,copilot
```

### Custom config and working directory

```yaml
name: Doc Detective

on:
  pull_request:
    paths:
      - 'docs/**'

permissions:
  contents: read

jobs:
  doc-detective:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: doc-detective/github-action@v2
        with:
          working_directory: docs
          config: .doc-detective.json
```

### Using action outputs

```yaml
name: Doc Detective

on:
  pull_request:

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  doc-detective:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: doc-detective/github-action@v2
        id: doc-detective
        with:
          exit_on_fail: false
          create_pr_on_change: true
          create_issue_on_fail: true
      - name: Print results
        if: always()
        run: |
          echo "Results: ${{ steps.doc-detective.outputs.results }}"
          echo "PR URL: ${{ steps.doc-detective.outputs.pull_request_url }}"
          echo "Issue URL: ${{ steps.doc-detective.outputs.issue_url }}"
```
