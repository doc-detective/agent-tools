---
name: doc-detective-install-github-action
description: 'Add a GitHub Actions workflow that runs Doc Detective documentation tests in CI on pull requests, pushes, or a schedule. Use only for running Doc Detective in GitHub Actions. Not for other CI systems, general GitHub workflows, or editing the workflows of the Doc Detective repositories themselves. To set up Doc Detective in a project first, use doc-detective-init.'
metadata:
  version: '3.2.0'
  organization: Doc Detective
  date: November 2026
  abstract: Install and configure the Doc Detective GitHub Action workflow for automated documentation testing in CI. Detects project context, creates workflow file, and configures action inputs including PR creation, issue creation, and integrations.
  references: https://docs.doc-detective.com, https://github.com/doc-detective/github-action
  user-invocable: 'true'
user-invocable: true
---

# Install GitHub Action

**Skill:** `doc-detective:doc-detective-install-github-action`

## Goal

Add a GitHub Actions workflow that runs the project's Doc Detective tests in CI. It has the features the user chose, and only the permissions those features need. The user should also get a list of the setup that GitHub requires outside the file, such as secrets and Actions settings. A workflow with wrong paths or missing permissions fails on every run.

## Usage

```bash
/doc-detective-install-github-action [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--trigger <event>` | `pull_request` (`push` with `--create-pr-on-change`) | Workflow trigger event (`pull_request`, `push`, `schedule`, etc.) |
| `--no-exit-on-fail` | false | Let the CI check pass when Doc Detective tests fail. By default, failing tests fail the check. |
| `--exit-on-fail` | true | Deprecated, because failing the check is now the default |
| `--create-pr-on-change` | false | Create a PR when files change during test execution (e.g., updated screenshots) |
| `--create-issue-on-fail` | false | Create a GitHub issue when tests fail |
| `--integrations <list>` | (none) | Comma-separated integrations to mention in issues (`doc-sentinel`, `promptless`, `dosu`, `claude`, `opencode`, `copilot`, `cursor`) |
| `--ci` | false | Non-interactive; use defaults, no prompts |

```bash
/doc-detective-install-github-action
/doc-detective-install-github-action --ci
/doc-detective-install-github-action --trigger push --no-exit-on-fail
/doc-detective-install-github-action --create-pr-on-change --create-issue-on-fail --integrations claude,copilot
```

## Guardrails

- **Install only in a GitHub repository.** `.git` must exist as a file or directory, and a remote must point to GitHub. Check `.git/config` for `github.com` in a remote URL, or run `gh repo view --json url` when the `gh` CLI is available. Otherwise, stop and tell the user that this skill is specific to GitHub. When you can't tell where the repository root is, ask.
- **Grant only the permissions the enabled features need.** Start from `contents: read`, and add each permission the configuration rules below name. Extra write access lets the action change more of the repository than the user chose.
- **Never overwrite an existing workflow without consent.** When `.github/workflows/doc-detective.yml` exists, show it, and ask the user for another name or for confirmation to overwrite it. With `--ci`, write `doc-detective-<timestamp>.yml` instead.
- **Show the workflow before you write it.** Without `--ci`, present the generated workflow, and explain each enabled feature and the permissions it requires. Get the user's confirmation before you write it.
- **Warn about `--create-pr-on-change` on `pull_request`.** On `pull_request`, the action builds its branch from the source PR's merge commit. The PR it opens then carries the source PR's changes too, and every source PR overwrites the same `pr_branch`. When the user passes `--trigger pull_request` with this option, warn them of both.

## Read the project

The workflow must point at the project's real config and docs:

- Look for an existing Doc Detective config (`.doc-detective.json`, `.doc-detective.yaml`, or `.doc-detective.yml`), and record its path.
- Note any existing `doc-detective*.yml` files in `.github/workflows/`, so the new file doesn't conflict with them.
- Find the docs directory. Use the config's `input` field when there is one. Otherwise, look for common directories such as `docs/`, `documentation/`, `content/`, or `wiki/`. When none exists, use `.`.

## Build the workflow

Start from this base structure:

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
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: doc-detective/github-action@v2
        with:
          # Inputs configured per options
```

Set the inputs and permissions from the project and the options:

| Condition | Action |
|---|---|
| Existing config found at repo root | Set `config` to the config file name |
| Existing config found outside repo root | Set `working_directory` to the config's parent directory, and set `config` to the file name only. `config` resolves against `working_directory`, so `working_directory: docs` with `config: docs/.doc-detective.json` points at `docs/docs/.doc-detective.json`. |
| `--no-exit-on-fail` | Set `exit_on_fail: false`. Otherwise, omit the input: it defaults to `true`. |
| `--create-pr-on-change` | Set `create_pr_on_change: true`, add `contents: write` and `pull-requests: write` permissions. Unless `--trigger` is given, trigger on `push` to the default branch instead of `pull_request`. |
| `--create-issue-on-fail` | Set `create_issue_on_fail: true`, add `issues: write` permission |
| `--integrations` provided | Set the `issue_mentions` input to the comma-separated list. Don't use the deprecated `integrations` input. |
| `--trigger schedule` | Use cron syntax; suggest `cron: '0 6 * * 1'` (Monday 6 AM UTC) and prompt for customization unless `--ci` |

Create `.github/workflows/` when it doesn't exist, and write the file there.

## Report

Give the path of the workflow file and a summary of the configured features. Then list the manual steps that apply:

- With `--create-pr-on-change` and the default `GITHUB_TOKEN`: In the repository's **Settings** > **Actions** > **General**, select **Allow GitHub Actions to create and approve pull requests**. In an organization, an owner must allow it at the organization level first. Without this setting, the default token can't open the PR. The action never approves pull requests.
- With `--create-pr-on-change` and a custom `token`: That setting doesn't apply; the token's own permissions do. The action pushes the branch with the checkout's credentials, so give `actions/checkout` the same token as its `token` input.
- With `--create-pr-on-change`: Each run force-pushes one branch, `doc-detective-changes` by default, and updates its open PR. Nobody should commit to that branch by hand, and a branch protection rule that blocks force-pushes to it stops the PR. By default, the PR also commits every changed file, including images that `screenshot` steps save, which can show unreleased UI or customer data. Suggest setting `pr_paths` to the folders the PR should update.
- With a custom `token` input: Add the secret to the repository settings.
- When the repository has branch protection rules: PRs that the action creates may need approval before merging.
- Always: Confirm that GitHub Actions is enabled for the repository.
- When the workflow triggers only on `pull_request`: GitHub makes the cache a `pull_request` run saves visible only to that pull request. Each new pull request's first run then installs Doc Detective, its runtime, and browsers again. Suggest adding a `push` trigger on the default branch, which saves a cache that every pull request can restore.
- Run files: By default, Doc Detective takes a screenshot after each browser, app, or device step and records each such context. They go in the run folder, `.doc-detective/runs/<runId>/`, under the config's `outputDir`. The action keeps the run folder and reports out of git through `.git/info/exclude`. To keep them after the job, add an `actions/upload-artifact` step with `include-hidden-files: true`. Its `path` is the run folder relative to the repo root. With the config in `working_directory` and no `outputDir` set, that's `<working_directory>/.doc-detective/runs/`, for example `docs/.doc-detective/runs/`. See [references/action-reference.md](references/action-reference.md#run-files-and-secrets).
- Secrets: Pass secrets to the job as environment variables, and reference them as `$NAME` in specs. Doc Detective shows their values as `***NAME***` in logs, results, and the issues the action creates.

## Done when

- The workflow file exists at `.github/workflows/doc-detective.yml`, or at the name the user chose.
- The `permissions:` block grants exactly what the enabled features require.
- PR creation, issue creation, and integrations match the user's choices.
- The user has the list of manual steps that apply.

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
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: doc-detective/github-action@v2
```

### With PR creation on file changes

```yaml
name: Doc Detective

on:
  push:
    branches: [main]

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
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: doc-detective/github-action@v2
        with:
          create_issue_on_fail: true
          issue_mentions: claude,copilot
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
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: doc-detective/github-action@v2
        with:
          working_directory: docs
          config: .doc-detective.json
          # Open PRs only from pushes to main. On pull_request, the PR would
          # carry the source PR's changes and share one pr_branch.
          create_pr_on_change: ${{ github.event_name == 'push' }}
          pr_labels: doc-detective,automated
          create_issue_on_fail: true
          issue_labels: doc-detective,test-failure
          issue_mentions: claude,copilot
```

## Related commands

- `/doc-detective-init`: Initialize Doc Detective in a repository. It offers GitHub Action setup when it finishes.
- `/doc-detective-test`: Run existing Doc Detective tests.
