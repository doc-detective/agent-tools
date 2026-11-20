# Doc Detective GitHub Action Reference

Complete reference for `doc-detective/github-action@v2`. Use this to configure workflow files without needing to fetch external documentation.

## Action Inputs

| Input | Description | Default |
|---|---|---|
| `version` | The Doc Detective version, range, or npm tag to install. `""` runs the `doc-detective` already resolvable in the working directory. | `5` |
| `working_directory` | Directory to run Doc Detective and its `git` commands in, relative to the repo root. `config` and `input` resolve against it. | `.` (repo root) |
| `cache` | Cache the `doc-detective` package, and the runtime and browsers it installs on first use, so later runs restore them instead of downloading them. On macOS runs that test iOS, also cache the WebDriverAgent build. Follows `DOC_DETECTIVE_CACHE_DIR` and a `cacheDir` in `DOC_DETECTIVE_CONFIG` or the project config. It doesn't read a `cacheDir` from the user-level config or a remote config. Set to `false` to install everything on every run. The action skips caching when `version` is `""`. A failed restore or save logs a warning, and the run continues. | `true` |
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

Run PR creation on `push` to the default branch, or on `schedule`. On `pull_request`, the checkout is the source PR's merge commit. The PR the action opens then carries the source PR's changes as well as its own, and every source PR overwrites the same `pr_branch`.

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

- **Node.js 24.22.1 or later on the 24 line, or 26.12.1 or later.** Node.js 25 and 26.0 through 26.12.0 aren't supported. `npx` runs Doc Detective 5 on the job's Node.js, not the action's own runtime. Add `actions/setup-node` with `node-version: 24` before the action, as every template below does. Below Node.js 24.15, the action logs a warning and runs anyway. On other unsupported versions, the action doesn't warn, and npm prints only an `EBADENGINE` warning during install.
- **Headless browsers on Ubuntu.** Ubuntu runners have no display, so Chrome and Firefox run headless. Doc Detective records headless Chrome, but not headless Firefox. To run headed or record Firefox, install Xvfb, or use a `macos-latest` or `windows-latest` runner.
- **Android emulator tests are Linux-only.** The `android` input enables KVM only on Linux runners. macOS and Windows runners can't accelerate the hosted emulator, so `android` contexts don't run there. See [Android emulator tests](#android-emulator-tests).
- **iOS tests are macOS-only.** iOS simulators run only on macOS runners, so `ios` platform contexts don't run on Linux or Windows. The action caches the WebDriverAgent build between runs. See [iOS tests](#ios-tests).
- **Default token scope.** The default `GITHUB_TOKEN` can create PRs and issues within the same repository. For cross-repo operations or repos with strict token policies, a custom `token` input may be required.

## Android emulator tests

Doc Detective can run tests against the `android` platform using an on-runner emulator, but that emulator needs hardware acceleration to be usable. On hosted Linux runners, `/dev/kvm` exists but isn't accessible to the runner user, so Doc Detective's capability probe fails and every `android` context SKIPs. The `android` input resolves this by granting the runner user KVM access before tests run.

With the default `android: auto`, the action scans your resolved specs and config for an `android` platform and enables KVM only when it finds one. Set `android: true` to always enable KVM on Linux, or `android: false` to leave it untouched. The input has no effect on macOS or Windows runners, where the hosted emulator can't accelerate anyway.

KVM setup is best-effort. If the action can't grant access, it emits a warning and the `android` contexts SKIP; the run never fails because of it. Doc Detective bootstraps everything else the emulator needs — the SDK, system image, AVD, and UiAutomator2 driver — at test time, so a Linux workflow needs nothing beyond the default `android: auto`.

## iOS tests

Doc Detective runs `ios` platform tests on macOS runners through the XCUITest driver, which depends on WebDriverAgent (WDA). WDA has to be built for the runner's Xcode version. With Doc Detective 5.6.0 or later, the first iOS test on a runner builds it, and the action's `cache` input saves that build. Later runs restore it instead of building it. On GitHub-hosted macOS runners, the build takes two to three minutes, and a restore takes a few seconds. The workflow needs no extra steps, and the action has no `ios` input.

The action caches the WDA build when all of these are true:

- The job runs on macOS.
- `cache` is on, and `version` isn't empty.
- A spec or config in `input`, `config`, or `working_directory` sets `ios` as a `platform` or `platforms` value. The action scans JSON, YAML, and Markdown files, up to six folders below each of those paths, and skips `node_modules`, `.git`, and `.github`.

The build has its own cache entry, about 70 MB, separate from the runtime and browsers. After the first save, the action saves the entry again only when a run builds WDA, such as after an Xcode or driver update. A failed restore or save logs a warning, and the run continues.

### Earlier Doc Detective versions, or `cache: false`

Doc Detective 5 versions before 5.6.0 build WDA into the cache folder only when you run the `install ios` subcommand. To keep that build between runs, point `DOC_DETECTIVE_CACHE_DIR` at a folder, restore and save that folder with `actions/cache`, and run `npx doc-detective@<version> install ios --yes` before the action. That folder already holds the runtime and browsers, so set `cache: false` on the action to avoid storing them twice.

Key the cache with a run-scoped key plus a `restore-keys` fallback. An exact cache hit never saves again, so a static key keeps restoring a build made for an older Xcode or driver. A run-scoped key always saves, and `restore-keys` restores the newest earlier entry.

With Doc Detective 5.6.0 or later and `cache: false`, leave out the `install ios` step, because the first iOS test builds WDA into the same folder.

Without a cached build, iOS tests still work. Each run then builds WDA during its first iOS test.

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
  push:
    branches: [main]   # seeds the cache that every pull request can restore

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

iOS tests must run on a macOS runner (for example, `macos-latest`), since iOS simulators are macOS-only. Nothing beyond the action itself is required. With Doc Detective 5.6.0 or later, the first iOS test builds WebDriverAgent, and the action caches that build for later runs. A cache saved by a `pull_request` run is visible only to that pull request. The `push` trigger on the default branch saves the entry that new pull requests restore. See [iOS tests](#ios-tests) for details.

### iOS tests with a Doc Detective version before 5.6.0

```yaml
name: Doc Detective

on:
  pull_request:
  push:
    branches: [main]   # seeds the cache that every pull request can restore

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
      - run: npx doc-detective@5.5.0 install ios --yes   # builds WebDriverAgent into the cache folder
      - uses: doc-detective/github-action@v2
        with:
          version: 5.5.0
          cache: false
```

Use this variant only with a Doc Detective 5 version before 5.6.0, which builds WebDriverAgent into the cache folder only when you run `install ios`. `DOC_DETECTIVE_CACHE_DIR` points Doc Detective at a cache folder, and `actions/cache` keeps it between runs. That folder also holds the runtime and browsers, so `cache: false` keeps the action from storing them twice. The run-scoped `key` saves on every run, and `restore-keys` restores the newest earlier entry. A cache saved by a `pull_request` run is visible only to that pull request. The `push` trigger on the default branch saves the entry that new pull requests restore. See [iOS tests](#ios-tests) for details.

### Using action outputs

```yaml
name: Doc Detective

on:
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
