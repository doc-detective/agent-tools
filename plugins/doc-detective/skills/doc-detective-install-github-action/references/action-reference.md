# Doc Detective GitHub Action Reference

Complete reference for `doc-detective/github-action@v1`. Use this to configure workflow files without needing to fetch external documentation.

## Action Inputs

| Input | Description | Default |
|---|---|---|
| `version` | Doc Detective version to install | `latest` |
| `working_directory` | Directory to run Doc Detective in | `.` (repo root) |
| `config` | Path to Doc Detective config file | (auto-detected) |
| `input` | Input file or directory to test | (from config) |
| `exit_on_fail` | Fail the GitHub Actions check if any test fails | `false` |
| `create_pr_on_change` | Create a pull request if files change during execution (e.g., updated screenshots) | `false` |
| `pr_branch` | Branch name for the created PR | `doc-detective/updates` |
| `pr_title` | Title for the created PR | `Doc Detective: Updated files` |
| `pr_body` | Body text for the created PR | (default message) |
| `pr_labels` | Comma-separated labels for the created PR | (none) |
| `pr_assignees` | Comma-separated assignees for the created PR | (none) |
| `pr_reviewers` | Comma-separated reviewers for the created PR | (none) |
| `create_issue_on_fail` | Create a GitHub issue when tests fail | `false` |
| `issue_title` | Title for the created issue | `Doc Detective: Test failures` |
| `issue_body` | Body text for the created issue | (default message with failure details) |
| `issue_labels` | Comma-separated labels for the created issue | (none) |
| `issue_assignees` | Comma-separated assignees for the created issue | (none) |
| `integrations` | Comma-separated integration identifiers to mention in issues | (none) |
| `prompt` | Custom prompt for AI integrations mentioned in issues | (none) |
| `token` | GitHub token for API operations (PR/issue creation) | `${{ github.token }}` |

## Action Outputs

| Output | Description |
|---|---|
| `results` | JSON string of Doc Detective test results |
| `pull_request_url` | URL of created PR (if `create_pr_on_change` triggered) |
| `issue_url` | URL of created issue (if `create_issue_on_fail` triggered) |

## Reports

The action attaches results to the workflow run on every run, whether tests pass or fail. This is always on and requires no configuration or permissions beyond the base `contents: read`.

- **Job summary:** a Markdown summary of the results (derived from the JSON) is written to the workflow run's summary page.
- **Artifact:** a `doc-detective-report` artifact is uploaded to the run. It bundles the JSON results (`doc-detective-results.json`), the Markdown summary (`doc-detective-summary.md`), and, when Doc Detective produces one (4.10.0 and later), the HTML report. Download it from the run's summary page.

The JSON in the artifact is the same data returned by the `results` output. Reports attach before the `exit_on_fail` check, so they are available even when tests fail.

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

- **Runs on `ubuntu-latest` only.** The action installs Doc Detective on Linux.
- **Headless browsers only.** Ubuntu runners have no display server. Firefox and Chrome automatically fall back to headless mode. Tests requiring visible browser windows will not work.
- **Default token scope.** The default `GITHUB_TOKEN` can create PRs and issues within the same repository. For cross-repo operations or repos with strict token policies, a custom `token` input may be required.

## Integrations

The `integrations` input accepts a comma-separated list of AI tool identifiers. When `create_issue_on_fail` is enabled, the action mentions these integrations in the issue body so they can automatically respond.

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
      - uses: doc-detective/github-action@v1
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
      - uses: doc-detective/github-action@v1
        with:
          exit_on_fail: true
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
      - uses: doc-detective/github-action@v1
        with:
          exit_on_fail: true
          create_issue_on_fail: true
          issue_labels: doc-detective,test-failure
          integrations: claude,copilot
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
      - uses: doc-detective/github-action@v1
        with:
          exit_on_fail: true
          create_pr_on_change: true
          pr_labels: doc-detective,nightly
          create_issue_on_fail: true
          issue_labels: doc-detective,nightly-failure
          integrations: claude,copilot
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
      - uses: doc-detective/github-action@v1
        with:
          working_directory: docs
          config: docs/.doc-detective.json
          exit_on_fail: true
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
      - uses: doc-detective/github-action@v1
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
