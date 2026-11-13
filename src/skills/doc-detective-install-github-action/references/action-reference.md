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

## Running against a local build

By default, `version` pins the package spec passed to npx (for example, `npx doc-detective@5`), so npx resolves Doc Detective from the npm registry. Set `version` to an empty string (`""`) to drop the `@version` suffix and run bare `npx doc-detective`, which lets npx use whatever `doc-detective` build is already available in the working directory. This is how a repository can dog-food the action against its own build under review instead of the published package.

The action does not install or link a local build for you. Make `doc-detective` resolvable in earlier workflow steps before this action runs — typically by checking out the build, installing its dependencies, and linking it with `npm link`. npx looks for the package from the `working_directory` input, and a global link made with `npm link` is visible from any directory. If no local `doc-detective` is resolvable, npx silently falls back to the latest published release, so confirm the link is in place (for example, with `npm ls -g doc-detective`) before relying on it.

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 24
- name: Build and link a local doc-detective
  run: |
    npm ci
    npm run build
    npm link
- uses: doc-detective/github-action@v2
  with:
    version: ""   # run the locally linked build instead of a published release
```

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
- **Android emulator tests are Linux-only.** The `android` input enables KVM only on Linux runners. macOS and Windows runners can't accelerate the hosted emulator, so `android` contexts don't run there. See [Android emulator tests](#android-emulator-tests).
- **iOS tests are macOS-only.** iOS simulators run only on macOS runners, so `ios` platform contexts don't run on Linux or Windows. To speed up those runs, prebuild the WebDriverAgent build with the Doc Detective CLI. See [iOS tests](#ios-tests).
- **Default token scope.** The default `GITHUB_TOKEN` can create PRs and issues within the same repository. For cross-repo operations or repos with strict token policies, a custom `token` input may be required.

## Android emulator tests

Doc Detective can run tests against the `android` platform using an on-runner emulator, but that emulator needs hardware acceleration to be usable. On hosted Linux runners, `/dev/kvm` exists but isn't accessible to the runner user, so Doc Detective's capability probe fails and every `android` context SKIPs. The `android` input resolves this by granting the runner user KVM access before tests run.

With the default `android: auto`, the action scans your resolved specs and config for an `android` platform and enables KVM only when it finds one. Set `android: true` to always enable KVM on Linux, or `android: false` to leave it untouched. The input has no effect on macOS or Windows runners, where the hosted emulator can't accelerate anyway.

KVM setup is best-effort. If the action can't grant access, it emits a warning and the `android` contexts SKIP; the run never fails because of it. Doc Detective bootstraps everything else the emulator needs — the SDK, system image, AVD, and UiAutomator2 driver — at test time, so a Linux workflow needs nothing beyond the default `android: auto`.

## iOS tests

Doc Detective runs `ios` platform tests on macOS runners through the XCUITest driver, which depends on WebDriverAgent (WDA). The first XCUITest session in a run compiles WDA from source with `xcodebuild`, which takes roughly 10 minutes on a cold, ephemeral runner and is the dominant cost of any iOS run. No extra setup is required: when no prebuilt WDA products exist, the first session builds WDA in-session.

### Speed up iOS tests with a CLI-managed WebDriverAgent prebuild

To skip the cold WDA compile on later runs, let Doc Detective's CLI prebuild WDA and persist its cache directory across runs. Run `npx doc-detective@5 install ios --yes` in your setup steps to compile WDA once into the Doc Detective cache, keyed by your Xcode and XCUITest driver versions; test sessions then consume those products automatically and read-only. Point `DOC_DETECTIVE_CACHE_DIR` at a directory, restore and save that directory with `actions/cache`, and run the prebuild before the action.

Key the cache with a rotating, run-scoped key plus a `restore-keys` fallback. An exact cache hit never re-uploads, so a static key would strand the products built for an older Xcode or driver toolchain and keep restoring a stale prebuild. A run-scoped key always saves, and `restore-keys` pulls the newest previous entry.

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
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: doc-detective/github-action@v2
        with:
          android: auto   # default; scans specs/config and enables KVM if an android platform is found
```

`android: auto` is the default, so a Linux job that targets the `android` platform needs nothing beyond the action itself. Use `android: true` to always enable KVM on Linux regardless of what the scan finds.

### iOS tests on macOS

```yaml
name: Doc Detective

on:
  pull_request:

permissions:
  contents: read

jobs:
  doc-detective:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: doc-detective/github-action@v2
```

iOS tests must run on a macOS runner (for example, `macos-latest`), since iOS simulators are macOS-only. Nothing beyond the action itself is required: when no prebuilt WebDriverAgent products exist, the first XCUITest session builds WDA in-session (~10 min on a cold runner). To skip the cold compile on later runs, use the CLI-managed prebuild below.

### iOS tests with a CLI-managed WebDriverAgent prebuild

```yaml
name: Doc Detective

on:
  pull_request:

permissions:
  contents: read

jobs:
  doc-detective:
    runs-on: macos-latest
    env:
      DOC_DETECTIVE_CACHE_DIR: ${{ github.workspace }}/.dd-cache
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: .dd-cache
          key: dd-cache-${{ runner.os }}-${{ github.run_id }}
          restore-keys: |
            dd-cache-${{ runner.os }}-
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npx doc-detective@5 install ios --yes   # prebuilds WebDriverAgent into the cache
      - uses: doc-detective/github-action@v2
```

This variant prebuilds WebDriverAgent through the Doc Detective CLI so later runs skip the cold `xcodebuild` compile. `DOC_DETECTIVE_CACHE_DIR` points Doc Detective at a cache directory, `actions/cache` persists it across runs, and `install ios --yes` compiles WDA once into it before the action runs; test sessions then consume those products automatically. The run-scoped `key` always saves the freshly built products, and `restore-keys` restores the newest previous entry — so when a runner image bumps Xcode or the driver version, the prebuild refreshes rather than restoring a stale build indefinitely. See [iOS tests](#ios-tests) for details.

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
