---
name: doc-detective-install-github-action
description: 'Install and configure the Doc Detective GitHub Action workflow for automated documentation testing in CI'
metadata:
  version: '1.1.0'
  organization: Doc Detective
  date: March 2026
  abstract: Install and configure the Doc Detective GitHub Action workflow for automated documentation testing in CI. Detects project context, creates workflow file, and configures action inputs including PR creation, issue creation, and integrations.
  references: https://doc-detective.com, https://github.com/doc-detective/github-action
  user-invocable: 'true'
user-invocable: true
---

# Install GitHub Action

**Skill:** `doc-detective:install-github-action`

Install and configure the Doc Detective GitHub Action for automated documentation testing in CI. Detects project context, creates the workflow file, and configures optional features like PR creation and issue creation.

## Usage

```bash
/doc-detective-install-github-action [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--trigger <event>` | `pull_request` | Workflow trigger event (`pull_request`, `push`, `schedule`, etc.) |
| `--exit-on-fail` | false | Fail the CI check when Doc Detective tests fail |
| `--create-pr-on-change` | false | Create a PR when files change during test execution (e.g., updated screenshots) |
| `--create-issue-on-fail` | false | Create a GitHub issue when tests fail |
| `--integrations <list>` | (none) | Comma-separated integrations to mention in issues (`doc-sentinel`, `promptless`, `dosu`, `claude`, `opencode`, `copilot`, `cursor`) |
| `--ci` | false | Non-interactive; use defaults, no prompts |

```bash
/doc-detective-install-github-action
/doc-detective-install-github-action --ci
/doc-detective-install-github-action --trigger push --exit-on-fail
/doc-detective-install-github-action --create-pr-on-change --create-issue-on-fail --integrations claude,copilot
```

## Entry Criteria

Confirm all of the following before starting. If any item is unavailable, stop and ask the user.

| Criteria | How to find it |
|---|---|
| Repository root is accessible | Check working directory — ask user if unclear |
| Git repository initialized | `.git/` directory exists |
| GitHub remote detected | `.git/config` references `github.com`, or `gh repo view` succeeds |
| Workflows directory exists or can be created | `.github/workflows/` exists or parent `.github/` can be created |

## Exit Criteria

Before completing:

1. [ ] Workflow YAML file created at `.github/workflows/doc-detective.yml` (or user-chosen name)
2. [ ] Required permissions documented in workflow comments
3. [ ] Optional features (PR creation, issue creation, integrations) configured per user choices
4. [ ] Manual steps reported to user (e.g., enabling Actions permissions, adding secrets)

## Workflow

**Phases run in order. Do NOT advance to the next phase if the current phase fails.**

1. Detect → 2. Configure → 3. Write → 4. Report

### Phase 1: Detect Context

1. Confirm this is a Git repository (`.git/` exists). If not, stop and inform the user.
2. Confirm the remote points to GitHub. Check `.git/config` for `github.com` in a remote URL, or run `gh repo view --json url` if the `gh` CLI is available. If not a GitHub repo, stop and inform the user this skill is GitHub-specific.
3. Check for existing Doc Detective config: `.doc-detective.json`, `doc-detective.config.js`. Record the path if found.
4. Check for existing workflows in `.github/workflows/` — note any existing `doc-detective*.yml` files to avoid conflicts.
5. Identify the docs directory: use the `input` field from existing config if available, otherwise look for common directories (`docs/`, `documentation/`, `content/`, `wiki/`). Fall back to `.` if no convention is detected.

### Phase 2: Configure Workflow

Build the workflow YAML based on project context and user options.

**Base workflow structure:**

```yaml
name: Doc Detective

on:
  <trigger>:     # from --trigger option, default: pull_request

permissions:
  contents: read   # base permission; expanded below if features require it

jobs:
  doc-detective:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: doc-detective/github-action@v1
        with:
          # Inputs configured per options
```

**Configuration rules:**

| Condition | Action |
|---|---|
| Existing config found | Set `config` input to the config file path |
| Config not at repo root | Set `working_directory` to the config's parent directory |
| `--exit-on-fail` | Set `exit_on_fail: true` |
| `--create-pr-on-change` | Set `create_pr_on_change: true`, add `contents: write` and `pull-requests: write` permissions |
| `--create-issue-on-fail` | Set `create_issue_on_fail: true`, add `issues: write` permission |
| `--integrations` provided | Set `integrations` input to the comma-separated list |
| `--trigger schedule` | Use cron syntax; suggest `cron: '0 6 * * 1'` (Monday 6 AM UTC) and prompt for customization unless `--ci` |

If not in `--ci` mode, present the generated workflow to the user for confirmation before writing. Explain each enabled feature and the permissions it requires.

### Phase 3: Write Workflow

1. Create `.github/workflows/` directory if it doesn't exist.
2. Check if `.github/workflows/doc-detective.yml` already exists.
   - If it exists and not in `--ci` mode: show the existing file, ask the user for an alternative name or confirm overwrite.
   - If it exists and in `--ci` mode: use `doc-detective-<timestamp>.yml` to avoid overwriting.
3. Write the workflow YAML file.

### Phase 4: Report

Summarize what was created and list any manual steps needed:

- **Created**: Path to the workflow file and a summary of configured features.
- **Manual steps** (if applicable):
  - If `--create-pr-on-change`: Remind the user that the default `GITHUB_TOKEN` works for PR creation, but if the repo requires specific token permissions, they may need to configure a custom token.
  - If using a custom `token` input: Remind the user to add the secret to the repository settings.
  - If the repository has branch protection rules: Note that PRs created by the action use the default `GITHUB_TOKEN` and may need approval before merging.
  - General: Confirm that GitHub Actions is enabled for the repository.

## Examples

### Basic — test on pull requests

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

### With PR creation on file changes

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
```

### With issue creation and integrations

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
          integrations: claude,copilot
```

### Full-featured with custom config

```yaml
name: Doc Detective

on:
  pull_request:
  push:
    branches: [main]

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
          config: docs/.doc-detective.json
          exit_on_fail: true
          create_pr_on_change: true
          pr_labels: doc-detective,automated
          create_issue_on_fail: true
          issue_labels: doc-detective,test-failure
          integrations: claude,copilot
```

## Related Commands

- `/doc-detective-init` — Initialize Doc Detective in a repository (includes GitHub Action setup as final step)
- `/doc-detective-project-bootstrap` — Full project bootstrap (includes GitHub Action setup as final step)
- `/doc-detective-test` — Run existing Doc Detective tests
