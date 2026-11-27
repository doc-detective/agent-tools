# Doc Detective Run-Time Behavior Reference

What Doc Detective 5 does when it runs: CLI commands, exit codes and streams, config precedence, result statuses and skip paths, browser selection, screenshot comparison, recording, and how inline and detected tests are read, each with its default, status, exit code, or stream. For action fields (including `retry`, `goToStep`, `if`, `assertions`), see actions.md (`doc-detective-generate/references/`); for writing a config, config-guidance.md (`doc-detective-init/references/`); for custom markup, markup-patterns.md (`doc-detective-inline/references/`). On run-time behavior, this file follows the current docs where those differ. In `Sources:` lines, `docs/` = doc-detective's `docs/fern/pages/docs/`, `reference/` = `docs/fern/pages/reference/`, `schemas/` = `src/common/src/schemas/src_schemas/`.

Contents: [CLI](#cli) · [Config loading](#config-loading) · [Results](#results) · [Browsers and contexts](#browsers-and-contexts) · [Screenshots](#screenshots) · [Recording](#recording) · [Inline and detected tests](#inline-and-detected-tests) · [v5 changes that break v4 habits](#v5-changes-that-break-v4-habits)

## CLI

### Commands and deprecated aliases

- `npx doc-detective` with no command runs tests and takes flags only. `doc-detective run [inputs...]` runs the same way with paths as arguments, added to any `--input`; `-` reads a spec or document from stdin.
- Other commands: `install`, `validate`, `debug`, `lsp`, `help`. `--version`, `--help`/`-h`, and `help <command>` (nested too: `help install browsers`) print info.
- Unknown flags are errors. A subcommand accepts only its own flags plus the globals `--quiet`, `--debug`, `--log-level`, `--json`, `--no-color`, `--no-input`; anything else exits `2` with `unknown option`. `lsp` takes only `--stdio`.
- Deprecated forms still work and warn on stderr at `warning` level (hidden by `-q`, `-l error`, `-l silent`):

  | Deprecated | Use |
  |---|---|
  | `runTests`, `runtests` | `run`, or no command |
  | `--logLevel` | `--log-level` |
  | `-e`, `--exit-on-fail` | Nothing; failing the run is the default |
  | `DOC_DETECTIVE` with a `config` object | `DOC_DETECTIVE_CONFIG` |
  | `DOC_DETECTIVE_RUNTIME_DEBUG` | `DOC_DETECTIVE_DEBUG` (both set, either on: exit `2`) |
  | Config key `beforeAny` | `beforeAll` (both set: exit `2`) |

- Removed with no alias: the `doc-detective-lsp` and `doc-detective-runner` bins, `install-agents`, and `--silent` on `install`.
- `DOC_DETECTIVE_DEBUG`, or `DEBUG` matching `doc-detective`, runs tests with debug output; the diagnostic dump is `doc-detective debug`.

### Exit codes

| Code | Meaning |
|---|---|
| `0` | No spec failed, and at least one passed or warned. Skipped specs alongside them are fine. |
| `1` | At least one spec failed. |
| `2` | Nothing valid was tested, or the CLI couldn't proceed: usage error, invalid flag value (`--browser-fallback nope`, `--concurrent-runners 0`, bare `--concurrent-runners`), invalid config, no specs, a filter that matched nothing, every spec skipped, an invalid spec, an unreadable `apiKeyFile`/`apiTokenFile`, a declined install, or a crash. |
| `130`, `143` | Interrupted by `SIGINT` / `SIGTERM`. |

- `WARNING` never fails a run. `SKIPPED` doesn't either, unless every spec skipped (exit `2`). A repo whose only steps are detected code blocks exits `2` without `--allow-unsafe`.
- `--no-exit-on-fail` or `exitOnFail: false` (default `true`) turns failed, empty, and all-skipped runs into `0` and skips invalid specs with a warning. Usage errors, invalid config, and crashes still exit `2`.
- A report that can't be written logs `Couldn't write the <report> to <path>: <cause>.`; a broken include warns. Neither changes the exit code.
- GitHub Action `@v2`: `exit_on_fail` defaults to `true`, and exit `2` always fails the job.

### stdout and stderr

- stdout carries results only. Logs, warnings, hints, notices, progress, and report-path lines go to stderr.
- Default logs label only warnings and errors (`Warning:`, `Error:`); `-d` labels every line (`(INFO)`) and adds timestamps. `-q` shows only errors and the one-line verdict. `-l silent` prints nothing, summary included. Log levels: `silent`, `error`, `warning`, `info` (default), `debug`.
- Report-path lines (`Results:`, `Run report:`, `Run summary:`, `Run results:`, `HTML report:`, `JUnit report:`, `Markdown summary:`) are info-level absolute paths; `-l warning` hides them.
- Hints print one tip only in an interactive terminal at `info` level; `--no-hints` turns them off.

### Output modes and refused combinations

- `--json`: one JSON results document on stdout.
- `--plain`: one line per test context, four tab-separated columns: result, spec ID, test ID, platform/browser (`linux/chrome`).
- `--output <file>` / config `output`: the JSON results file, overwritten every run. A path that isn't an existing folder becomes a file, even without an extension. An existing folder or a trailing slash exits `2`. `-` means stdout.
- `--dry-run`/`-n` / config `dryRun`: detect, extract, merge config, and print the resolved test plan as JSON on stdout; no step runs.
- Only one mode writes stdout. These exit `2`:
  - `--json --plain`: ``Error: set `--json` or `--plain`, not both.``
  - `--output -` (or config `output: "-"`) with `--plain`: ``Error: set `--output -` or `--plain`, not both.``
  - `--dry-run` (or config `dryRun: true`) with `--plain`: ``Error: set `--dry-run` or `--plain`, not both.``
- These compose: `--output` beats config `output`; `--dry-run --output <file>` writes the plan to the file and prints it; `--plain --output <file>` prints lines and writes the file.

### List flags

- `--input`/`-i`, `--test`/`-t`, `--spec`/`-s`, `--reporters`/`-r`, and `install agents --agent` take one comma-separated list, given once. Repeating the flag exits `2`. Space-separated values exit `2` (`-r terminal html` reads `html` as a command).
- `--input` defaults to `.`. It takes files, folders (recursive; `recursive` defaults to `true`), URLs that return the file itself (`raw.githubusercontent.com`, not a `github.com` page), and `-`. Folders named `.doc-detective` are never searched.
- `--test` / `--spec`: case-insensitive regexes matched anywhere in `testId` / `specId`; any pattern matching runs it. Anchor with `^...$` for an exact ID. The value splits on commas first, so a pattern can't contain a comma. Config: `testFilter`, `specFilter`; flags win. Matching nothing prints `No tests ran.` and exits `2`, with no run folder.
- `--reporters` names: exactly `terminal`, `json`, `html`, `runFolder`, `junit`, `markdown`. Any other name (`JSON`) exits `2`.

### Other run switches

| Flag | Default | Behavior |
|---|---|---|
| `--allow-unsafe` | off | Runs `unsafe` steps. Config `allowUnsafeSteps`. `--no-allow-unsafe` overrides config. |
| `--concurrent-runners <n>` | `1` | Contexts run concurrently. `auto`/`true` = CPU cores, max 4. Cross-context variables are unsupported above `1`. |
| `--browser-fallback` | `auto` | `auto`, `explicit`, `off`. See [`browserFallback`](#browserfallback). |
| `--shell` | `bash` | Default `runShell` shell: `bash`, `cmd`, `powershell` (last two Windows only). On Windows, `bash` is Git Bash, installed if missing. |
| `--verification` | `existing` | Write-back mode `existing`, `true`, `false`. See ["Last verified" write-back](#last-verified-write-back). |
| `--cache-dir` | see `install` | Beats `DOC_DETECTIVE_CACHE_DIR` and config `cacheDir`. |
| `--no-auto-update` | off | Skips the startup self-update, which never crosses a major and never runs when `CI` is set. |

No flag selects platform, browser, or headless mode; those are contexts.

### `--no-auto-screenshot` and `--no-auto-record`

- Automatic screenshots and recordings are on by default. These flags set the **config** level to `false`, so a spec's or test's `autoScreenshot: true` / `autoRecord: true` still wins (test > spec > config).
- `--auto-record` passed explicitly is strict: a recording the host can't make is SKIPPED, and one that fails to start fails.
- While either is on, the `runFolder` reporter runs even if `--reporters` omits it.

### `validate`

- Checks spec files and inline tests without running them, finding files as a run does (positional inputs, `--input`, `--config`).
- Output names each invalid file and problem, then a count of files checked; pages with no tests aren't listed. `--json`: `{ valid, files: [{ path, valid, errors }] }`.
- Exit `0`: at least one test found, all valid. `1`: any spec or inline test invalid. `2`: usage error, invalid config, or no tests found.
- Errors name the field path and suggest a key: ``tests[0].steps[0]: unknown key `asertions`. Did you mean `assertions`?`` The first five problems print, then `and N more`.

### `install` and supported browsers

- Subcommands: `all`, `browsers`, `runtime`, `bash`, `android`, `ios`, `status`, `agents`. `install all` covers runtime packages, browsers, and Git Bash on Windows, not `agents`, `android`, or `ios`.
- `install browsers` names: `chrome`, `firefox`, `chromedriver`, `geckodriver` (all four by default). Safari isn't installable. Chrome/ChromeDriver have no `linux/arm64` build and report `skipped`.
- `install android` never downloads without `--yes`; declining exits `2`. `install ios` is macOS-only.
- `install` reads `cacheDir` from config and `.env`; an invalid config exits `2`. Default cache: an existing `~/.doc-detective`, else `$XDG_CACHE_HOME/doc-detective` (`%LOCALAPPDATA%\doc-detective` on Windows), else `~/.cache/doc-detective`.
- `doc-detective debug` prints findings with `fix:` commands and the effective config, and runs no tests.

Sources: reference/cli.mdx, reference/cli/install.mdx, docs/ci/upgrade-to-v5.mdx, docs/ci/reporters-and-artifacts.mdx, docs/tests/overview.mdx, docs/troubleshooting/setup-issues.mdx, schemas/config_v3.schema.json, adrs/01146-cli-v5-contract.md, adrs/01166-one-separator-per-list-flag.md, adrs/01191-output-modes-compose-or-refuse.md

## Config loading

### File discovery

- Without `--config`: `.doc-detective.json`, then `.yaml`, then `.yml` in the current directory. None: defaults.
- `--config <path>` is authoritative; a wrong path fails, never falls back.
- User config: `$XDG_CONFIG_HOME/doc-detective/config.json` (`%APPDATA%\doc-detective\config.json` on Windows).

### Precedence order

Highest first:

1. Flags.
2. Shell environment: `DOC_DETECTIVE_CONFIG` (JSON config), with single-purpose vars beating it: `DOC_DETECTIVE_CACHE_DIR`, `DOC_DETECTIVE_DEBUG`/`DEBUG`, `DO_NOT_TRACK`, `DOC_DETECTIVE_SKIP_AUTO_UPDATE`. Deprecated `DOC_DETECTIVE` applies just below `DOC_DETECTIVE_CONFIG` and warns every run.
3. `.env` in the current directory, filling only variables the shell left unset.
4. Project config. A config-level `loadVariables` file also fills only unset variables.
5. User config.
6. Schema defaults.

- A `loadVariables` **step** replaces variables already set.
- `runTests()` reads only the config passed to it; env config, config files, and `.env` are CLI layers.

### How layers merge

- Objects merge key by key; arrays replace.
- Each source validates against `config_v3` alone. An invalid one exits `2` with `Error: Invalid config in <source>:` and one `<key path>: <problem>` line per problem. Flags override the validated result.
- Unknown keys are invalid, including inside custom `fileTypes`, `inlineStatements`, and `markup`.
- Boolean env vars: on for `1`, `true`, `yes`, `on`; off for unset, empty, `0`, `false`, `no`, `off`; any case. Other values count as off and warn.

### Relative paths

A relative path (`input`, `output`, `outputDir`, `cacheDir`, `loadVariables`, `beforeAll`, `afterAll`, `apiKeyFile`, `apiTokenFile`, `descriptionPath`) resolves against the source that set it:

| Source | Resolves against |
|---|---|
| Project config | Its folder (`relativePathBase` default `file`). With `relativePathBase: "cwd"`, or a config loaded from a URL: current directory. |
| User config | Its folder, always. |
| `DOC_DETECTIVE_CONFIG`, flags, single-purpose vars | Current directory. |

- An unset path, such as default `input`/`outputDir` of `.`, resolves like the project config's, so `-c sub/doc-detective.json` without `outputDir` writes the run folder under `sub/`.
- Paths inside a spec resolve against the spec file. A spec loaded from a URL resolves them against `outputDir`.

### `outputDir` and the run folder

- `outputDir` (default `.`) holds the run folder, the `html`, `junit`, and `markdown` reports, and files Doc Detective names itself (`<stepId>.png`, `<stepId>.mp4`, cookie files with no `directory`).
- Run folder: `<outputDir>/.doc-detective/runs/<runId>/` with `testResults.json`, `.html`, `.md`, and `specs/<specId>/tests/<testId>/contexts/<contextId>/{screenshots,recordings}/`. Names inside are stable across runs. Run folders are never deleted; gitignore `.doc-detective/`.
- `outputDir` ending in `.json`, `.html`, `.htm`, `.xml`, or `.md` is a file; reports land beside it, and a matching `json`/`html` reporter overwrites it.

### Reporters

| Reporter | Writes |
|---|---|
| `terminal` (default) | Summary on stdout |
| `runFolder` (default) | `testResults.json`, `.html`, `.md` in the run folder |
| `json` | `<outputDir>/testResults-<runId>.json` |
| `html` | `<outputDir>/testResults-<runId>.html` (media load from the run folder) |
| `junit` | `<outputDir>/junit.xml`, overwritten each run |
| `markdown` | `<outputDir>/doc-detective-summary.md`, overwritten each run |

- `"reporters": []` runs none, so no summary prints; the run folder still archives while automatic capture is on. JUnit has no warning state: a warned case passes.

### Environment variable masking

- Logs, reports, and results show `***NAME***` for each substituted `$NAME`, each variable from `.env`, `loadVariables`, or a credential file, and each variable whose name contains `TOKEN`, `SECRET`, `PASSWORD`, `API_KEY`, `PRIVATE_KEY`, or `CREDENTIAL`. Values under 4 characters aren't masked. Steps and assertions use real values. Pixels are a separate case: screenshots blur elements holding a masked value, with gaps ("Redaction and blur"), and recordings show the page unblurred ("Narration and audio").
- `publicVariables` (config, spec, or test; `*` wildcard) unmasks a name for the whole run.

Sources: reference/cli.mdx, docs/ci/reporters-and-artifacts.mdx, docs/ci/upgrade-to-v5.mdx, docs/ci/secrets.mdx, docs/troubleshooting/setup-issues.mdx, schemas/config_v3.schema.json, adrs/01165-one-config-env-var-and-one-precedence-order.md, adrs/01192-one-path-rule-for-every-config-source.md

## Results

### Statuses

- `PASS`: completed as expected.
- `FAIL`: an error or failed assertion. Stops the test by default.
- `WARNING`: a comparison exceeded `maxVariation` (screenshot, saved command/code/response output, recording checkpoints), a recording went stale, an annotation fell outside the image, or an explicitly requested browser ran on a fallback. The test continues. Never fails a run.
- `SKIPPED`: couldn't or shouldn't run here. Distinct from `FAIL`.

Skip reasons read `Skipped: <reason>.`; failures start with `Couldn't`. Scripts should read `result` and `resultCode`, not message text.

### Roll-up

- FAIL anywhere below makes the unit FAIL; otherwise WARNING anywhere makes it WARNING (WARNING sits between PASS and FAIL).
- A context's result comes from its steps plus a `FAIL` or `WARNING` automatic recording. A `PASS`/`SKIPPED` recording doesn't count, so a context whose steps all skipped stays SKIPPED.
- A test is SKIPPED only when every context is SKIPPED. A run where every spec skipped exits `2`.
- `summary.specs`, `.tests`, `.contexts`, `.steps` each carry `pass`, `fail`, `warning`, `skipped`. `summary.steps` excludes the automatic recording.
- The verdict counts tests: `1 of 12 tests failed (2 with warnings, 3 skipped).`, `All 12 tests skipped.`, `9 of 12 tests passed (2 with warnings, 3 skipped).`, `12 of 12 tests passed.`, `No tests ran.`
- Summaries list `Failed (N):`, `Warnings (N):`, `Skipped (N):` by ID path `<specId> › <testId> › <contextId> › <stepId>`. Steps skipped after a failure collapse into `N more steps skipped after the failure.`

### What makes a unit SKIPPED

Contexts:

- Platform mismatch: ``Skipped: this context targets `windows`, not this host.``
- Browser unavailable after an automatic install attempt (Chrome and Firefox install on demand; Safari/`webkit` never does), or none at all: ``Skipped: no supported browser is available on `linux`.``
- A browser object without `name`.
- Unsupported mobile combinations (`firefox` on `android`, `chrome` on `ios`), `ios` on a non-macOS host, an Android host that can't run the emulator, or `DOC_DETECTIVE_NO_ANDROID_AUTOINSTALL=1` without the toolchain.
- A page-emulation key the browser can't set: ``Skipped: `firefox` can't set `clock`.``
- Unmet `requires` (commands, files, env vars), each one reported.
- No browser could start a session under the `browserFallback` policy.
- A mobile context mixing the device browser and native app surfaces.
- A `record` `name` reused while that recording is active: the test skips in every context, with a warning, before the run starts.

Specs, tests, steps:

- `if` false. Unresolvable conditions, plain text (`"1"`, `"yes"`, `$FEATURE_FLAG`), failed or empty `jq()`, and `$$steps.*` in a spec/test `if` all count as false. A false step `if` skips only that step.
- An `unsafe` step without `allowUnsafeSteps`/`--allow-unsafe`.
- Steps after a FAIL, or after a step routing `stop: "test"`. Remaining tests after a test-level `stop: "spec"`.
- Action-level: `screenshot: false`, `record: false`, `stopRecord: false`, `wait: false`; `record` on an existing file under the default `overwrite: "false"`; `record` on headless Firefox or Safari; `record` covered by a failed host check (its `stopRecord` skips too).

A step skipped before it ran (`if` false, unsafe) fires `onSkip`, but `retry` entries there are passed over. A step never reached fires no handler.

### Routing changes flow, not the verdict

- Defaults: PASS, WARNING, SKIPPED continue; FAIL stops the test. A failing test doesn't stop sibling tests.
- A FAIL step routed to `continue` stays FAIL and the test still fails. A PASS step routed to `stop` stays PASS; the rest is SKIPPED.
- Only `assertions` change a step's result; they can add a failure but not rescue one, and are skipped when the action failed or produced nothing.
- Steps allow `continue`, `stop: "test"`, `retry`, `goToStep`. Tests allow `continue`, `stop` (`test` is a no-op, `spec` skips remaining tests), `goToTest`. Anything else makes the spec invalid. A handler on a test makes its spec run tests in order.
- `goToStep`/`goToTest` to a missing ID fails; a loop hitting the per-context or per-spec limit fails. Revisited units carry `visit`.

### Config `retries` vs step `retry`

| | Config/context `retries` | Step `retry` route |
|---|---|---|
| Re-runs | The whole context, on a new session | One step, same session |
| Trigger | After a failing context, a probe finds a dead session, a browser error page (`chrome-error:`, `about:neterror`), or a session still on its blank start page | The step's result matches the handler |
| Genuine assertion failure | Never retried | Retried |
| Default | `1` (max `10`; `0` disables) | none; `limit` 1-100, `delay` `0` ms, `backoff` `fixed` or `exponential` |
| Reported | Final attempt only | Final attempt; `attempts` = total runs |

After `retry` runs out, routing resolves again without `retry` entries, falling to the next match or the default:

```json
{
  "tests": [
    {
      "steps": [
        {
          "runShell": "./flaky-check.sh",
          "onFail": [{ "retry": { "limit": 2, "delay": 500 } }, { "continue": true }]
        }
      ]
    }
  ]
}
```

### Result fields

- `resultCode` on every FAIL step and FAIL automatic recording: `environment` (network, session, or page load), `drift` (a browser `find`/`click`/`dragAndDrop` missed but similar elements exist), `assertion` (everything else).
- `outputs.nearMatches` and `resultHint` (``Closest match: `Save changes`.``) on drift.
- Steps appear in effective form, defaults filled: `{"goTo": "https://example.com"}` reports `goTo.url` and `goTo.timeout` (`30000`). `screenshot.path` / `record.path` hold absolute file paths.

### Invalid specs

- Invalid: an unknown key on a spec or step (or in `click`, `runCode`, `record`, `dragAndDrop`), two actions in one step, duplicate `testId`s, a missing `before`/`after` file or an invalid step in one, an invalid inline step, wrong-scope routing, an out-of-range value (`timeout` below `1` on `goTo`, `checkLink`, `httpRequest`, `runShell`, `runCode`, `startSurface`; negative durations), or `autoScreenshot` on a step.
- Default: exit `2` before any test runs. With `exitOnFail: false` / `--no-exit-on-fail`, the invalid spec is skipped with a warning and the rest run. `runTests()` rejects with `Invalid test specifications, so nothing ran:` under the same rule.

Sources: docs/tests/overview.mdx, docs/ci/reporters-and-artifacts.mdx, docs/ci/upgrade-to-v5.mdx, docs/ci/overview.mdx, docs/troubleshoot/overview.mdx, docs/test-docs/automatic-recording.mdx, docs/config/contexts.mdx, reference/expressions.mdx, schemas/config_v3.schema.json, adrs/00013-json-result-output-and-pass-warning-fail-rollup.md, adrs/01199-reject-invalid-specs-from-runtests-by-default.md

## Browsers and contexts

### Supported browsers per platform

| Platform | Browsers |
|---|---|
| `windows`, `linux` | `chrome`, `firefox` |
| `mac` | `chrome`, `firefox`, `webkit` (alias `safari`) |
| `android` (managed emulator) | `chrome` only |
| `ios` (managed simulator, macOS host with Xcode) | `safari` only, the real device Safari; `webkit` skips |

- Contexts are `runOn` entries at config, spec, or test level; test overrides spec overrides config. Omitted `platforms` = current platform. Several `browsers` fan the test out per engine.

### Defaults: browser, size, headless

- A context needing a browser and naming none runs the first available of Chrome, Firefox, Safari.
- Browsers run headless unless the context sets `headless: false`. With no display, browser tests run headless.
- A desktop browser with no `window` or `viewport` gets a 1200×800 viewport. `viewport` is set by resizing the window, so the minimum window width applies (desktop Chrome about 500px, headless too); a smaller request renders larger, logs a warning, and passes. A headed window can't exceed the display.
- On a device, the device sets the size; `window`, `viewport`, or `headless: false` there is an error.

### WebKit and Safari limits

- macOS only. No headless mode. No automatic install. Needs `safaridriver --enable` and Develop > Allow Remote Automation.
- Can't be recorded headless (and has no headless mode). Sets no page-emulation keys, so a Safari context setting one skips.

### `browserFallback`

Doc Detective validates each driver by running it and repairs a failing browser once by reinstalling it before falling back.

| Value | Auto-selected browser can't start | Explicitly requested browser can't start |
|---|---|---|
| `auto` (default) | Runs on another browser | Runs on another browser; reports WARNING |
| `explicit` | Runs on another browser | SKIPPED with a diagnostic |
| `off` | SKIPPED with a diagnostic | SKIPPED with a diagnostic |

- Set in config, by `--browser-fallback`, or per `runOn` entry (the entry wins). Chrome, Firefox, and Safari/WebKit fall back to each other. Device browsers have no fallback. A fallback must support the context's page-emulation keys.
- On Linux, a driver built for another CPU architecture is excluded before it runs.

### Page emulation keys

`colorScheme`, `locale`, `timezone`, `deviceScaleFactor`, `reducedMotion`, `clock`: Chrome sets all; Firefox all but `timezone` and `clock`; Safari, Android, iOS none. Unsupported: context SKIPPED. Chrome rejecting a `timezone`/`clock` value: context FAIL.

### How browsers are driven

- Chrome, Firefox, ChromeDriver, and Geckodriver download into the cache; webdriverio and Appium drive sessions. Safari uses the system `safaridriver`. Each run starts with a warm phase that installs missing browsers and drivers and probes sessions.
- Device browsers: one per device; from an Android emulator the host is `10.0.2.2`, not `localhost`.

Sources: docs/config/contexts.mdx, docs/tests/overview.mdx, docs/ci/docker-and-headless.mdx, docs/troubleshooting/setup-issues.mdx, docs/get-started/installation.mdx, docs/ci/reporters-and-artifacts.mdx, docs/ci/upgrade-to-v5.mdx, schemas/config_v3.schema.json

## Screenshots

### Paths

- `screenshot: true` saves `<stepId>.png` in `outputDir`, the same path every run. With no `stepId` and no `path`: ``Couldn't name the screenshot. Set `path`, or set the step's `stepId`.``
- A string or `path` resolves against the spec file, or against `directory` when set. An unset variable in `path`/`directory` fails the step and names the field.
- `screenshot: false` skips the step.

### `overwrite` values

| Value | Reference exists at `path` |
|---|---|
| `"aboveVariation"` (default) | Compares; replaces it only when variation exceeds `maxVariation` |
| `"false"` | SKIPPED before capture: ``Skipped: file already exists at `<path>`.`` No comparison runs, even with `maxVariation` set. To compare, use `"aboveVariation"`. |
| `"true"` | Replaces it every run; no drift detection. For seeding or resetting a reference. |

No file at `path`: the capture is saved and `maxVariation` is ignored, so the first run seeds the reference. A URL `path` ignores `overwrite`.

### `maxVariation` comparison and statuses

- Comparison runs when a reference exists at `path` and `overwrite` is `"aboveVariation"` (the default), or when `path` is a URL. `maxVariation` is 0-1, default `0.05`.
- Within it: PASS. Beyond it: WARNING, not FAIL; the test continues.
- Outputs: `$$variation`, `$$aspectRatioMatches`, `$$width`, `$$height`, `$$resizedToReference`.
- A URL `path` ending in `.png` is a read-only reference, downloaded once per run. The new capture goes to the context's `screenshots/` folder in the run folder as `<stepId>_<timestamp>_<file>.png`; `outputs.referenceUrl` records it. Unreachable URL or invalid image: FAIL. A public URL redirecting to a private address fails unless `DOC_DETECTIVE_ALLOW_LOCAL_URLS=1`; `DOC_DETECTIVE_BLOCK_LOCAL_URLS=1` refuses all private and loopback references.
- Automatic screenshots never compare against a reference.

### Differently sized images

1. Doc Detective resizes the window so the viewport matches the reference, recaptures, compares, and restores the window. It doesn't resize when the step uses `crop`, `overwrite` is `"true"`, a `record` step's recording is running (the automatic recording doesn't block it), the context's `viewport`/`window` no longer matches the reference (within 16px of `viewport`, or 5% for `window`, still matches), or both dimensions differ by one factor. If the browser can't reach the size, it warns and compares the first capture.
2. Still different: compared only if aspect ratios are within 5%; otherwise FAIL.
3. Each dimension within 5%: compares the shared top-left region, so unchanged content reports `0`.
4. A larger same-factor difference (pixel density): both images scale to the smaller size.

### Crop

- `crop` takes a selector or text string, or an object with any `find` element field plus `padding`.
- The element scrolls to the viewport's center before capture, so fixed headers and footers don't cover it. A padded element bigger than the viewport fails (`Element can't fit in viewport.`). `elementImage` doesn't scroll. App-surface captures don't support `crop`.

### Automatic screenshots

- On by default: a screenshot after every step that drives a browser, native app (Windows, macOS), or device, headless included. None for non-UI steps (`runShell`, `httpRequest`, `wait`) or steps with their own `screenshot`. Failed steps still get one.
- Saved as `<runDir>/specs/<specId>/tests/<testId>/contexts/<contextId>/screenshots/<NN>-<action>-<stepId>.png`; each step's `autoScreenshotPath` is relative to `runDir`.
- Opt out with `autoScreenshot: false` at config, spec, or test (test > spec > config), or `--no-auto-screenshot`. On a step it makes the spec invalid.
- If image packages can't install, the run warns `Not taking automatic screenshots: couldn't install sharp (…)` and continues.

```json
{
  "autoScreenshot": false,
  "tests": [
    {
      "autoScreenshot": true,
      "steps": [{ "goTo": "https://example.com" }]
    }
  ]
}
```

### `screenshot.annotations` vs `annotate`

| | `screenshot.annotations` | `annotate` action |
|---|---|---|
| Lifetime | One capture | Until cleared, `duration` ends, or the context ends |
| In recordings | No | Yes |
| App surfaces | Yes; only `elementText`, `elementId`, `elementTestId`, `elementAria`; no bare string; no `all` | No; needs a page |
| Touches the page | No; composited into the image | Yes |

- Types: `outline`, `arrow`, `badge`, `callout`, `blur`, `text`. Field syntax: see actions.md, `annotate`.
- Screenshot annotations apply after `crop`. Element targets wait 5000 ms (object-form `timeout`). An unresolved target fails the step; one outside the image returns WARNING.
- `annotate` `update` of an id not on screen fails; `clear` of a missing id does nothing; `clear` runs before `add`.
- Annotations change pixels, so changing one or the theme invalidates references compared with `maxVariation`.

### Redaction and blur

- A `blur` without `all: true` (which needs an object target) covers only the first match.
- A live `annotate` blur is burned into every browser screenshot taken while it's up, before `crop`. If the page won't report its blurs, the screenshot fails rather than saving unredacted.
- In recordings, use `annotate` with `all: true`, `track: true`, `transition: { "enter": "none" }`; a fade-in exposes the content.
- Secret masking: before each browser screenshot (steps and automatic), elements whose text or value holds a masked env value are blurred; a field that received a typed secret shows dots. Not covered: iframes, shadow DOM, canvas, CSS pseudo-elements, secrets split across sibling elements, native app and device captures, and page text in recordings.

### `annotationDefaults` cascade

Config < spec < test < the annotation's own `style`. Base properties apply to all types; a per-type block (`badge`, `blur`, ...) overrides them. Unset fields use the built-in theme.

### Hosted runs (Doc Detective Online)

The hosted runner sets `autoScreenshot: false` and `autoRecord: false` at the config level, overriding the repository config and job snapshot (alongside its own `outputDir`, `output`, `exitOnFail`). A spec or test set to `true` still captures. Authored `screenshot` and `record` steps are unaffected.

Sources: docs/actions/screenshot.mdx, src/core/tests/saveScreenshot.ts, docs/test-docs/screenshot-visual-regression.mdx, docs/test-docs/automatic-screenshots.mdx, docs/test-docs/annotate-screenshots.mdx, docs/actions/annotate.mdx, docs/test-docs/narrate-recordings.mdx, docs/ci/secrets.mdx, docs/ci/upgrade-to-v5.mdx, schemas/screenshot_v3.schema.json, adrs/01196-hosted-runs-turn-automatic-capture-off.md, adrs/01202-burn-live-annotate-blurs-into-screenshots.md, adrs/01204-center-crop-targets-before-capture.md, adrs/01205-compare-same-scale-screenshots-by-cropping.md

## Recording

### Basics

- Formats `.mp4`, `.webm`, `.gif`, extension in any case. Video only, no audio.
- `record: true` saves `<stepId>.mp4` in `outputDir`; a string or `path` resolves against the spec file or `directory`. `record: false` skips.
- `stopRecord: true`/`null` stops the newest active recording (LIFO); `"<name>"` or `{ "name": "<name>" }` stops that one; `false` skips. Unstopped recordings finalize at the end of the context.

### Engines

| Engine | Captures | Needs | Concurrency |
|---|---|---|---|
| `browser` | The Chrome tab only, across navigation | Chrome, headed or headless; no display | Concurrent; one per context |
| `ffmpeg` | The screen (`target` `display`/`window`/`viewport`; `fps` `30`) | A headed context on a real or virtual display; FFmpeg auto-installs | Serialized with other browser-driven tests |

- Default: `browser` for any Chrome context, `ffmpeg` otherwise. A second overlapping `browser` recording falls back to `ffmpeg` with a `viewport` target and a warning.
- App surfaces (`surface: { "app": ... }`) record with `ffmpeg` cropped to the window; `viewport` target or `browser` engine on an app skips.
- Android and iOS record the device screen. `engine` doesn't apply (an explicit one skips). One recording per device, 30-minute cap, fully concurrent.

### Host checks and headless limits

- Once per run, Doc Detective checks FFmpeg runs, plus: a signed-in desktop (Windows), Screen Recording permission for the launching app (macOS), a working `DISPLAY` or installed Xvfb (Linux). A failed check SKIPs the `record` steps it covers: ``Skipped: there's no display to capture. To record, install Xvfb or set DISPLAY, and rerun.``
- Headless Firefox and Safari `record` steps are SKIPPED; set `headless: false`. While `autoRecord` is on, headless Firefox runs headed when the host can capture, so its `record` steps record. Linux with no display runs headed contexts on Xvfb.

### Automatic recording

- On by default; wraps each context from before the first step to after the last:

  | Context | Recorded by |
  |---|---|
  | Headless Chrome (default) | `browser` engine |
  | Headless Chrome with its own `record` step | Not automatically; the step wins |
  | Headed Chrome, Firefox, Safari | `ffmpeg` |
  | Headless Firefox | Run headed + `ffmpeg` if the host can capture; else not recorded |
  | Native app (Windows, macOS) | `ffmpeg`, scoped to the first app window |
  | Android/iOS app or mobile web | The device |
  | No browser, app, or device steps | Not recorded |

- Saved at `<runDir>/specs/<specId>/tests/<testId>/contexts/<contextId>/recordings/<contextId>.mp4`. Reported in the context's `autoRecording` field (`result`, `recordingPath` relative to `runDir`, and more), not in `steps`.
- Unset (default): what the host can't record is left out with one warning (``Warning: Not recording automatically: ...``); a recording that can't start is SKIPPED. `true`: what the host can't record is SKIPPED; a failed start FAILs the context and SKIPs its steps.
- Opt out: `autoRecord: false` at config, spec, or test, or `--no-auto-record`.
- On Linux each runner records its own Xvfb display. On Windows and macOS, concurrent `ffmpeg` auto-recordings overlap on the shared display, with a warning.
- An untargeted `stopRecord` never stops the automatic recording. Checkpoints don't apply to it.

### `overwrite` modes

| Value | File already exists |
|---|---|
| `"false"` (default) | Skips the recording; checkpoints still compare |
| `"true"` | Re-records and overwrites |
| `"aboveVariation"` | Always records; replaces the file and baselines only on checkpoint drift beyond `maxVariation`, an added/removed/edited step, or a missing file; otherwise discards the capture. Turns checkpoints on, even over `checkpoints: false`. A failed step in the span keeps the old file. |

### Checkpoints and baselines

- `checkpoints: true` screenshots after every step while recording and compares each to a baseline in `<path>.checkpoints/`. Object form: `maxVariation` (default `0.05`), `directory` (relative to the recording).
- First run: `stopRecord` seeds the baselines; commit them. Later runs: within `maxVariation` passes; beyond it `stopRecord` returns WARNING. A checkpoint that can't be compared also warns. Comparisons never modify baselines.

### Staleness detection

- When capture is skipped (headless run the engine can't record, or existing file under `"false"`), a span with checkpoints still compares against committed baselines and writes nothing.
- Diverged: `stopRecord` returns WARNING with `$$stale: true` and a hint (headless: re-run headed; existing file: `overwrite` `"true"`/`"aboveVariation"` or delete it). No baselines yet: always stale.
- A step failing in the span, or no checkpoints captured: `stopRecord` is SKIPPED with no outputs.
- Staleness never fails a build; gate on `$$stale` or the warning count. For headless rendering noise, raise `checkpoints.maxVariation` above the reported `maxCheckpointVariation`.

```json
{
  "tests": [
    {
      "steps": [
        {
          "record": {
            "path": "signup-flow.mp4",
            "overwrite": "aboveVariation",
            "checkpoints": { "maxVariation": 0.1 },
            "verify": { "minDuration": 2, "notBlack": true }
          }
        },
        { "goTo": "https://example.com" },
        {
          "screenshot": {
            "path": "home.png",
            "maxVariation": 0.05,
            "overwrite": "aboveVariation"
          }
        },
        { "stopRecord": true }
      ]
    }
  ]
}
```

### `verify` guards

A violated guard FAILs `stopRecord`: `minDuration`/`maxDuration` (seconds), `resolution` (`true` or `{width, height}`, ±2 px), `notBlack` (black frames cover 95% or more).

### `stopRecord` outputs

- On save: `$$recordingPath`, `$$format`, `$$duration`, `$$width`, `$$height`, `$$fps` (best-effort).
- Checkpoints: `$$checkpoints`, `$$maxCheckpointVariation`, `$$seededBaselines`, `$$checkpointErrors`. `aboveVariation`: `$$changed`, `$$changeReasons`, `$$baselineFailures`. `verify`: `$$resolutionMatches`, `$$allBlack`. Skipped capture: `$$stale`.
- A skipped `stopRecord` (nothing active, or its `record` SKIPPED) has no outputs.

### Narration and audio

Recordings have no audio. To narrate, use `annotate`: annotations persist across steps and navigation and appear in the video. `screenshot.annotations` never appear in recordings. Page text isn't blurred during recording, so a page showing a secret shows it; typed secrets in browser fields show as dots.

Hosted runs turn `autoRecord` off: see [Hosted runs (Doc Detective Online)](#hosted-runs-doc-detective-online).

Sources: docs/actions/record.mdx, docs/actions/stopRecord.mdx, docs/test-docs/automatic-recording.mdx, docs/test-docs/video-visual-regression.mdx, docs/test-docs/narrate-recordings.mdx, docs/actions/annotate.mdx, docs/ci/docker-and-headless.mdx, docs/ci/upgrade-to-v5.mdx, schemas/record_v3.schema.json, schemas/config_v3.schema.json, adrs/01196-hosted-runs-turn-automatic-capture-off.md, adrs/01197-size-a-browser-recording-by-its-steady-frames.md

## Inline and detected tests

### Statement syntax per format

| Format (extensions) | Test start | Test end | Ignore |
|---|---|---|---|
| Markdown (`md`, `markdown`, `mdx`) | `{/* test {...} */}`, `<!-- test {...} -->`, `[comment]: # (test {...})` | `test end` in the same forms | `test ignore start` / `test ignore end` |
| HTML (`html`, `htm`) | `<!-- test {...} -->` | `<!-- test end -->` | `<!-- test ignore start -->` / `end` |
| AsciiDoc (`adoc`, `asciidoc`, `asc`) | `// (test {...})` | `// (test end)` | `// (test ignore start)` / `end` |
| reStructuredText (`rst`) | `.. test {...}` | `.. test end` | `.. test ignore start` / `end` |
| DITA (`dita`, `ditamap`, `xml`) | `<?doc-detective test ... ?>`, `<!-- test ... -->`, `<data name="doc-detective" value="test ..."/>` | `test end` in the same forms | `test ignore start` / `end` (PI or comment) |
| Gherkin (`feature`) | `# test {...}` above a scenario or its tags | None. The scenario ends the test | `# test ignore start` / `end` |

- Steps use the same forms with `step`. Content is JSON or YAML (Gherkin: JSON only); DITA also takes XML attributes (`testId="x" detectSteps=false`, dot notation for nesting) and decodes XML entities first.
- A step with no open test gets a test created around it. A new `test` closes an open one.

### When a statement isn't read

- Statements are read from comments only. Inside a code block, inline code, `<pre>`, `<code>`, `<script>`, `<style>`, `<codeblock>`, `<codeph>`, `<screen>`, `<msgblock>`, or an AsciiDoc listing, literal, or passthrough block, a statement is a sample.
- Each statement must fit on one line, except an RST comment's indented block and a DITA YAML processing instruction.
- `.mdx` has no HTML comments: use `{/* */}` or `[comment]: #` for every statement, `test end` included.
- AsciiDoc: `//` counts only at the start of a line; the parentheses are required. A `// (meta ...)` statement ends at the first `)`.
- RST: blank line before and after each statement; a `..` line continuing a paragraph is prose. Directives, targets, footnotes, citations, and substitution definitions aren't comments.
- DITA processing instructions must start `<?doc-detective`. The old `<data name="step">{...}</data>` form isn't read.
- A comment that merely starts with "test" (`<!-- testing notes -->`) doesn't open a test.
- A `test end` also ends an open ignore block.

### Ignore blocks and per-listing ignore markers

- Content between `test ignore start` and `test ignore end` produces no steps.
- Per code block, to stop a detected `runCode`: Markdown ` ```bash testIgnore `; AsciiDoc `[source,bash,testIgnore]`; RST `:class: testIgnore`.

### `detectSteps` precedence

Config `detectSteps` defaults to `true`. It's the master switch: with config `false`, no file is scanned for detectable markup, so a test's `detectSteps: true` can't turn detection back on for its block. To detect in some files and not others, run them with separate configs. With config `true`, a test's `detectSteps: false` turns detection off inside that test's block; an explicit `false` is honored, and only unset defaults to `true`. Specs have no `detectSteps` key. With detection off, inline statements still run.

### What the built-ins detect

Every built-in parses the file first, then detects:

| Step | From |
|---|---|
| `goTo` | An `http(s)` link right after "Go to", "Open", "Navigate to", "Visit", "Access", "Proceed to", "Launch", "Browse to" |
| `checkLink` | Every `http(s)` link, including one after "Go to" |
| `click` | Bold text right after "Click", "Tap", "Left-click", "Choose", "Select", "Check" |
| `find` | All bold text, including bold after "Click" |
| `type` | Quoted text after "Type", "Enter", "Press" in prose, first letter upper- or lowercase |
| `screenshot` | An image with the `screenshot` class; its source is the save path |
| `httpRequest` | A code block tagged `http`, or untagged, holding a request line, headers, blank line, body |
| `runCode` | A code block tagged `bash`, `python`, `py`, `javascript`, `js`, marked `unsafe` |

- Bold is captured as rendered (`` **`Save`** `` finds `Save`). Markdown also reads `__bold__`, HTML `<a href>`/`<strong>`, and lowercase JSX tags in `.mdx`. HTML `&quot;` quotes don't match `type`. RST doesn't read roles (`` :guilabel:`Save` ``).
- DITA adds `<uicontrol>` (click, find, type target), `<wintitle>` (find), `<link>`/`<xref>` (checkLink); `<codeblock>` language comes from `outputclass="language-x"`.
- Custom `regex` markup matches raw text, code samples included; selectors match structure. A config `fileTypes` list replaces the default list.
- A test without a `testId` gets a new generated ID when its steps change.

### Gherkin (`.feature`)

Gherkin files don't use the built-in detection table above. Each step phrase maps to an action instead, or sets emulation or the previous request's accepted status. A data table after `I fill in:` or `I should see:` makes one step per row.

- Each `.feature` file is a spec, and each `Scenario` (or `Example`) is a test whose `testId` and `description` are the scenario name. `Background` steps run at the start of every scenario. A `Scenario Outline` runs once per `Examples` row, with `testId` `<name> [row N]`.
- Step phrases include `I go to "<url>"`, `I click "<text>"`, `I should see "<text>"`, `I type "<keys>" into "<selector>"`, `I press "<key>"`, `I run "<command>"`, `I send a <METHOD> request to "<url>"`, and `I take a screenshot "<path>"`. Use only phrases from the full table at https://docs.doc-detective.com/docs/test-docs/input-formats/gherkin#step-phrases. A step that matches no phrase doesn't run and warns on stderr; the rest of the scenario still runs.
- With `detectSteps: false`, in config or in a `# test {...}` statement, step phrases neither run nor warn, and only `# step` statements run.
- `I run:` with a doc string makes an unsafe `runCode` step, which is SKIPPED without `allowUnsafeSteps`.
- Tags: `@chrome`, `@firefox`, `@safari`, `@webkit` and `@windows`, `@mac`, `@linux`, `@android`, `@ios` set `runOn`; `@headless` runs headless; `@record` sets `autoRecord`; `@skip` and `@wip` skip the test (SKIPPED); `@id:<id>` sets `testId`. A `# test {...}` statement's keys win over tags.
- Emulation steps (`a 390x844 viewport`, `dark mode`, `the locale is "de-DE"`, `the timezone is "Europe/Berlin"`) apply to the whole scenario. With no browser tag, the scenario runs in Chrome.
- Keywords must be in English. To add phrases, write `markup` entries in a file type that extends `gherkin`, matching `element` nodes with tag `step`.

Sources: docs/input-formats/gherkin.mdx, adrs/01227-built-in-gherkin-file-type.md

### Unsafe detected code

- Detected `runCode` steps SKIP unless `allowUnsafeSteps: true` or `--allow-unsafe`. Detected `httpRequest` blocks aren't unsafe and run.
- The official Docker image sets `allowUnsafeSteps: true` in a user config, the lowest layer; project config, `DOC_DETECTIVE_CONFIG`, or `--no-allow-unsafe` overrides it.

### MDX parsing

An `.mdx` file that isn't valid MDX parses as Markdown with a warning, and content inside its JSX components isn't detected. A `.md` file with HTML comments included into an `.mdx` page keeps working statements.

### Includes

- On by default (`resolveIncludes: true`). Includes are inlined before detection, so a snippet's test runs inside each including page, once per page. Supported: AsciiDoc `include::`, MkDocs `--8<--`, mdBook `{{#include}}`, Fern `<Markdown src>`, MDX component imports, RST `.. include::`.
- An included file (partial) doesn't run alone unless named alone in `--input`. Includes must be local and inside the working directory. A broken include warns on stderr and never fails the run.

### DITA maps

A `.ditamap` input runs DITA-OT (`dita` on `PATH`) and tests the resolved topics, so conrefs and keyrefs resolve. A standalone topic isn't processed. `processDitaMaps` defaults to `true`.

### "Last verified" write-back

- `verification.write`: `"existing"` (default) fills only `verified-by` entries and `badge: true` tests already present; `true` also adds them on passing runs (writing a generated `testId` into a JSON `test` statement first); `false` writes nothing.
- Writes only on PASS; FAIL, SKIPPED, or WARNING leave the date to age. An unknown `check` warns only. Formats written: Markdown/MDX, HTML, AsciiDoc, DITA; never RST.
- `badge: true` works only on an inline `test` statement (shields.io badge on the line above); on a spec-file test it warns and skips.

Sources: docs/tests/inline.mdx, docs/tests/detected.mdx, docs/input-formats/overview.mdx, docs/input-formats/markdown.mdx, docs/input-formats/asciidoc.mdx, docs/input-formats/rst.mdx, docs/input-formats/html.mdx, docs/input-formats/dita.mdx, docs/input-formats/includes.mdx, docs/input-formats/custom.mdx, docs/test-docs/last-verified-on.mdx, docs/ci/github-action.mdx, docs/ci/docker-and-headless.mdx, docs/ci/upgrade-to-v5.mdx, schemas/config_v3.schema.json, schemas/test_v3.schema.json, src/common/src/detect/selectors.ts, src/common/src/detectTests.ts, src/core/tests/saveScreenshot.ts

## v5 changes that break v4 habits

Each item is detailed in its section above.

- Exit `1` on failure; exit `2` on empty, all-skipped, or invalid-spec runs (v4 exited `0` and skipped invalid specs).
- Unknown keys, two actions in a step, and duplicate `testId`s make a spec invalid. Plain-text and broken-`jq()` conditions are false.
- Logs on stderr; `--output` is a file, not a folder; no default `testResults-*.json` in the current directory; list flags take one comma list.
- Automatic screenshots and recordings are on, and every run writes a run folder. Default browser is headless Chrome.
- Detection reads parsed structure: nothing inside code; AsciiDoc and HTML detect like Markdown; capitalized `Type` and `py`/`js` fences become steps; `json` fences don't.
- Results show effective step objects; `$$stdioMatched`, `$$aspectRatioMatch`, `$$resolutionMatch` became `...Matches`.
- `.env` loads automatically; env values print as `***NAME***`; `edge` isn't a browser; `timeout: 0` is invalid except on locators (`find`, `click`, `type`), where it checks once.

Sources: docs/ci/upgrade-to-v5.mdx, reference/cli.mdx
