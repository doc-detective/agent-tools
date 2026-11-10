# Doc Detective GitHub Action Reference

Complete reference for `doc-detective/github-action@v2`. Use this to configure workflow files without needing to fetch external documentation.

## Action Inputs

| Input | Description | Default |
|---|---|---|
| `version` | The Doc Detective version, range, or npm tag to install. `""` runs the `doc-detective` already resolvable in the working directory. | `5` |
| `working_directory` | Directory to run Doc Detective in | `.` (repo root) |
| `android` | Set up KVM for the Android emulator on Linux runners: `auto` (only when a spec has an `android` platform), `true`, or `false` | `auto` |
| `config` | Path to Doc Detective config file | (auto-detected: `.doc-detective.json`, `.yaml`, or `.yml`) |
| `input` | Input file or directory to test | (from config) |
| `exit_on_fail` | Fail the job if any test fails. Set to `false` to report failures without failing the job. The job still fails when nothing valid was tested. | `true` |
| `create_pr_on_change` | Create a pull request if files change during execution (e.g., updated screenshots) | `false` |
| `pr_branch` | Branch name for the created PR | `doc-detective-<timestamp>` |
| `pr_title` | Title for the created PR | `Doc Detective Changes` |
| `pr_body` | Body text for the created PR | (default message) |
| `pr_labels` | Comma-separated labels for the created PR | `doc-detective` |
| `pr_assignees` | Comma-separated assignees for the created PR | (none) |
| `pr_reviewers` | Comma-separated reviewers for the created PR | (none) |
| `create_issue_on_fail` | Create a GitHub issue when tests fail | `false` |
| `issue_title` | Title for the created issue | `Doc Detective Failure` |
| `issue_body` | Body text for the created issue | (default message with the results) |
| `issue_labels` | Comma-separated labels for the created issue | `doc-detective` |
| `issue_assignees` | Comma-separated assignees for the created issue | (none) |
| `issue_mentions` | Comma-separated tools to mention in issues. Replaces the deprecated `integrations`. | (none) |
| `issue_prompt` | Text that follows each mention. Replaces the deprecated `prompt`. | `Investigate potential causes of the failures reported in this Doc Detective test output and suggest fixes.` |
| `token` | GitHub token for API operations (PR/issue creation) | `${{ github.token }}` |

## Action Outputs

| Output | Description |
|---|---|
| `results` | JSON string of Doc Detective test results |
| `pull_request_url` | URL of created PR (if `create_pr_on_change` triggered) |
| `issue_url` | URL of created issue (if `create_issue_on_fail` triggered) |

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

The action needs `contents: write` to push a new branch and `pull-requests: write` to open the PR.

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

- **Headless browsers on Ubuntu.** Ubuntu runners have no display server, so Firefox and Chrome fall back to headless mode. For tests that need a visible browser window, use a `macos-latest` or `windows-latest` runner.
- **Default token scope.** The default `GITHUB_TOKEN` can create PRs and issues within the same repository. For cross-repo operations or repos with strict token policies, a custom `token` input may be required.

## Run Files and Secrets

By default, Doc Detective takes a screenshot after every step that drives a browser, app, or device. It also records each such context when the runner can. The action writes the results file and the run folder that holds these files to `${{ runner.temp }}`. They stay out of the repository and out of `create_pr_on_change` pull requests. To keep them, upload them from `${{ runner.temp }}` with `actions/upload-artifact` in a later step.

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
      - uses: doc-detective/github-action@v2
        with:
          working_directory: docs
          config: docs/.doc-detective.json
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
