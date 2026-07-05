# Doc Detective GitHub Action Reference

Complete reference for `doc-detective/github-action@v1`. Use this to configure workflow files without needing to fetch external documentation.

## Action Inputs

| Input | Description | Default |
|---|---|---|
| `version` | Doc Detective version to install | `latest` |
| `working_directory` | Directory to run Doc Detective in | `.` (repo root) |
| `android` | Enable Android emulator support on Linux runners by granting KVM access (see [Android emulator tests](#android-emulator-tests)). `auto` scans your specs and config and enables KVM only when an `android` platform is found; `true` always enables it on Linux; `false` never does. No effect on macOS/Windows runners. | `auto` |
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

- **Headless browsers on Linux.** Ubuntu runners have no display server. Firefox and Chrome automatically fall back to headless mode, so tests requiring visible browser windows won't work on Linux; use a macOS or Windows runner for those.
- **Android emulator tests are Linux-only.** The `android` input enables KVM only on Linux runners. macOS and Windows runners can't accelerate the hosted emulator, so `android` contexts don't run there. See [Android emulator tests](#android-emulator-tests).
- **Default token scope.** The default `GITHUB_TOKEN` can create PRs and issues within the same repository. For cross-repo operations or repos with strict token policies, a custom `token` input may be required.

## Android emulator tests

Doc Detective can run tests against the `android` platform using an on-runner emulator, but that emulator needs hardware acceleration to be usable. On hosted Linux runners, `/dev/kvm` exists but isn't accessible to the runner user, so Doc Detective's capability probe fails and every `android` context SKIPs. The `android` input resolves this by granting the runner user KVM access before tests run.

With the default `android: auto`, the action scans your resolved specs and config for an `android` platform and enables KVM only when it finds one. Set `android: true` to always enable KVM on Linux, or `android: false` to leave it untouched. The input has no effect on macOS or Windows runners, where the hosted emulator can't accelerate anyway.

KVM setup is best-effort. If the action can't grant access, it emits a warning and the `android` contexts SKIP; the run never fails because of it. Doc Detective bootstraps everything else the emulator needs — the SDK, system image, AVD, and UiAutomator2 driver — at test time, so a Linux workflow needs nothing beyond the default `android: auto`.

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

### Android emulator tests on Linux

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
        with:
          android: auto   # default; scans specs/config and enables KVM if an android platform is found
```

`android: auto` is the default, so a Linux job that targets the `android` platform needs nothing beyond the action itself. Use `android: true` to always enable KVM on Linux regardless of what the scan finds.

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
