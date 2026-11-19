---
name: doc-detective-doc-testing
description: 'Verify documentation and procedures with Doc Detective test specifications. MANDATORY: Read SKILL.md first. Format: {"goTo":"url"} {"find":"text"} {"click":"text"} - action IS the key. NEVER {"action":"goTo"}. Keywords: test spec, Doc Detective, test JSON, test documentation, test docs, test procedure, verify procedures.'
metadata:
  version: '2.1.0'
  organization: Doc Detective
  date: November 2026
  abstract: Test documentation procedures by converting them to Doc Detective test specifications and executing them. Validates that documented workflows match actual application behavior through automated browser testing.
  references: https://docs.doc-detective.com, https://github.com/doc-detective/doc-detective
  user-invocable: 'false'
---

## Goal

Show whether documented procedures still match how the product behaves. Turn the procedures into a Doc Detective test spec that validates, and run it unless the user asked only for a spec. Then trace each failure back to the documentation section it tests. The user relies on the spec and the results to decide whether the docs or the product is wrong.

Use Doc Detective rather than Playwright for documented procedures, UI workflows described in docs, and browser tests derived from documentation. Use Playwright only to build a custom test framework, for browser automation that Doc Detective doesn't offer, or when the user asks for it.

## Guardrails

### The action name is the step's key

Doc Detective has no `"action"` property. It rejects a step written that way:

```json
✅ { "goTo": "https://example.com" }   // action name IS the key
✅ { "click": "Submit" }
❌ { "action": "goTo", "url": "..." }  // INVALID - Doc Detective will reject this
```

### Return and run only a spec that passed validation

An invalid spec fails at runtime and gives the user nothing to act on. When validation fails, fix each error and validate again until it passes. The fallback validator can pass a spec that the installed engine rejects, so confirm it as [Validate](#validate) describes.

### Match on text, not selectors

Use text strings (`{ "click": "Submit" }`) rather than CSS selectors. Text matches what the reader sees, and it keeps working when the markup changes. Use a selector only when the text is ambiguous or absent, or the documentation gives one.

### Never copy a masked value into a spec

Results and logs show the values of variables the run used, such as `$PASSWORD`, as `***NAME***`. The step ran with the real value. When you fix a spec, keep its `$NAME` reference. The masked text isn't the real value.

### Inject only with the user's confirmation

Injection edits the user's documentation source. Preview it, and apply it only after the user confirms.

## Interpret the docs

When a tool named `detect_tests` (or `mcp__doc-detective__detect_tests`) is registered, call `detect_tests({content: <doc-content>, filePath?: <path>, fileType?: <type>})`. Use the returned `tests[]` array as the spec when it covers the procedures. When a tool named `validate_spec` (or `mcp__doc-detective__validate_spec`) is registered, use it to validate instead of a script. See `_shared/MCP-USAGE.md` for tool names on each host and for `log_observation` guidance.

Without `detect_tests`, map each documented instruction to a step:

| Documentation describes | Doc Detective step format |
|---|---|
| Navigate to URL | `{ "goTo": "https://..." }` |
| Click/tap element | `{ "click": "Button Text" }` |
| Find/verify element | `{ "find": "Expected Text" }` |
| Type text | `{ "type": { "keys": "text", "selector": "#id" } }` |
| API call | `{ "httpRequest": { "url": "...", "method": "GET" } }` |

See `references/actions.md` for the full action catalog.

A spec built this way looks like this:

```json
{
  "tests": [
    {
      "testId": "login-flow",
      "description": "Verify login procedure from documentation",
      "steps": [
        { "description": "Navigate to login page", "goTo": "https://example.com/login" },
        { "description": "Verify login form", "find": "Sign In" },
        { "description": "Enter username", "type": { "keys": "testuser", "selector": "#username" } },
        { "description": "Submit login", "click": "Sign In" },
        { "description": "Verify dashboard", "find": "Dashboard" }
      ]
    }
  ]
}
```

### Known actions

These are the valid action types. The validator rejects any other step key:
- `goTo` - URL string or `{ url: string, waitUntil?: { networkIdleTime?: number, domIdleTime?: number, find?: object }, newTab?: true | string | object, newWindow?: true | string | object, surface?: object }`. `newTab`/`newWindow` open and name a browser tab/window (mutually exclusive; only `goTo` opens tabs and windows).
- `click` - Text string or `{ selector: string }`
- `find` - Text string or `{ selector: string, timeout?: number, elementText?: string }`
- `type` - `{ keys: string | string[], selector?: string, surface?: string | object, waitUntil?: object, timeout?: number }`. `surface` targets a process (name or `{ process }`), a browser window/tab (`{ browser, window?, tab? }`), or a native app (`{ app, window? }`).
- `wait` - Number (ms), `true` (5000 ms), or a variable string such as `"$WAIT_DURATION"`. No object form: to wait for an element, use `find` with `timeout`.
- `screenshot` - Path string or `{ path: string, surface?: object }`. `surface` can target a browser window/tab or a native app (`{ app, window? }`).
- `httpRequest` - `{ url: string, method: string, ... }`
- `runShell` - `{ command: string, exitCodes?: number[], stdio?: string, workingDirectory?: string, args?: string[], background?: { name: string, waitUntil?: object }, timeout?: number }`. `stdio` matches stdout **or** stderr (string or `/regex/`). The object form is strict: there is **no** `stdout`/`stderr` field, and using one invalidates the spec.
- `runCode` - `{ language: string, code: string, background?: { name: string, waitUntil?: object }, timeout?: number }`
- `startSurface` - `{ app: string, name?: string, args?: string[], workingDirectory?: string, env?: object, waitUntil?: { delayMs?: number, find?: object }, timeout?: number, driverOptions?: object }`. Launches a native app as an automation surface on Windows, macOS, Android, or iOS; other platforms are SKIPPED. On macOS, launch by `.app` path or bundle ID. Grant the process running Doc Detective the Accessibility permission (System Settings → Privacy & Security → Accessibility), or the context is SKIPPED. `env` is supported on macOS but rejected on Windows; `workingDirectory` fails on every app driver. `elementText`/`elementId`/`elementAria` and native XPath/`~id` selectors target elements (CSS is browser-only).
- `closeSurface` - Process name string, browser surface `{ browser, name?, window? | tab? }`, native app surface `{ app }`, or an array of these. Closes background processes, browser tabs/windows, whole browsers, or apps; missing surfaces are a no-op.
- `runBrowserScript` - JS string or `{ script: string, args?: any[], output?: string }` (runs in the browser page; `args` accepts any JSON-serializable values; return value captured into `outputs.result`)
- `checkLink` - URL string or `{ url: string, statusCodes?: number[] }`
- `loadVariables` - File path string
- `loadCookie` / `saveCookie` - File path string
- `record` - Path string or object (object supports an optional `name`)
- `stopRecord` - Boolean, null, a recording `name` string, or `{ name }`
- `annotate` - `{ add?: [...], update?: [...], clear?: true | string[] }` (at least one). Draws persistent annotations into the page for recordings/screenshots; browser-only (skipped without a page)
- `dragAndDrop` - `{ source, target, duration?, surface? }`. `source` and `target` take a string or an element object (`selector`, `elementText`, `elementId`, ...).
- `swipe` - A direction string (`"up"`, `"down"`, `"left"`, `"right"`), `{ direction, distance?, duration?, surface? }`, or `{ from: {x, y}, to: {x, y}, duration?, surface? }`.

## Validate

With the MCP tool, call `validate_spec({object: <spec>, schemaKey: "spec_v3", addDefaults: true})`. `valid: true` means `Validation PASSED`. Report each entry of `errors[]` as `[instancePath]: [message]`.

Without it, save the spec and run the bundled validator. Continue only when the output shows `Validation PASSED`:

```bash
echo '<spec-json>' > test-spec.json
node ./scripts/doc-detective-validate-test.js test-spec.json
```

> **Schema-skew caveat.** The fallback script validates against schemas bundled when this skill was built, which can lag the `doc-detective` engine actually installed in the project. A spec can pass the fallback validator yet be rejected at runtime (e.g. an unknown `runShell` key). Prefer the MCP `validate_spec` (it tracks the live schema). Without it, confirm a passing result with `npx doc-detective@5 validate test-spec.json`, which checks the spec against the Doc Detective 5 engine and runs nothing. Exit `0` counts as `Validation PASSED`. Exit `1` means the spec is invalid: fix each field stdout names, then re-run the fallback script and this command until both pass. Exit `2` means a usage error, a bad config, or no tests found, not a spec error: check the file path and config, then retry. If the command fails with an unknown-command error (a Doc Detective version without `validate`), skip it and rely on the test run instead. If the run exits `2` with `Invalid test specifications, so nothing ran:`, the spec is wrong despite the validator passing. If the config sets `exitOnFail: false`, the run skips an invalid spec and runs the rest. The log level can hide that skip, so treat a passing run as inconclusive.

## Offer inline injection

Offer to inject the tests into their source file when the spec passed validation. The spec must come from a specific, accessible source file, not a URL or a description from the user. Inline tests sit beside the content they test, so the next person who edits the procedure sees its test.

Write the spec to a temporary file, and preview the injection without `--apply`:

```bash
echo '<validated-spec-json>' > /tmp/doc-detective-spec-$(date +%s).json
node ../doc-detective-inline-test-injection/scripts/inline-test-injection.js /tmp/doc-detective-spec-<timestamp>.json <source-file-path>
```

After the user confirms, apply it:

```bash
node ../doc-detective-inline-test-injection/scripts/inline-test-injection.js /tmp/doc-detective-spec-<timestamp>.json <source-file-path> --apply
```

For a spec that covers several source files, offer injection separately for each file. Return the full JSON spec whatever the user decides. When the injection tool isn't available, return the spec without injecting it.

## Run the tests

Use the first runner that's available:

```bash
# 1. Global CLI
doc-detective --input test-spec.json --output results.json
# 2. Docker
docker run -v "$(pwd):/app" docdetective/docdetective --input /app/test-spec.json --output /app/results.json
# 3. NPX
npx doc-detective@5 --input test-spec.json --output results.json
```

These specs need CLI 5 or later. Move to the next runner when the command itself isn't available, or when its `--version` reports a version below 5. If none are available, inform the user and suggest installation. Otherwise, act on the exit code:

| Exit code | Meaning | Next step |
|---|---|---|
| `0` | No test failed, and at least one passed or warned. A config with `exitOnFail: false` exits `0` even when tests fail | Read the results file's `summary` before reporting success |
| `1` | At least one test failed | A normal outcome, not a crash: read the results file |
| `2` | Nothing valid was tested, because of bad usage, bad config, no tests, every test skipped, or an internal error | Fix the problem named on stderr. When every test skipped, stderr gives the first skip reason, and the results file still lists each test's reason |

Logs, warnings, and the paths of report files go to stderr. The terminal summary goes to stdout. `--output <file>` writes the JSON results to exactly that path. `--output-dir <dir>` sets where run folders and reports go. To read results from stdout instead of a file, pass `--json`. Then stdout holds only the JSON results.

### Run options

- **Auto screenshots:** On by default. Doc Detective captures a PNG after every step that drives a browser, app, or device and has no explicit `screenshot`. Add `--no-auto-screenshot` to turn them off. Images land in `<outputDir>/.doc-detective/runs/<runId>/` nested under `specs/<specId>/tests/<testId>/contexts/<contextId>/screenshots/` at stable paths for run-over-run comparison.
- **Per-run artifacts:** Each run's screenshots, recordings, and results land in its run folder, `<outputDir>/.doc-detective/runs/<runId>/`. The results' `runDir` names it.
- **Stable IDs:** Specs, tests, contexts, and steps without explicit IDs get deterministic fallbacks from the file path, a content hash, or the platform and browser. The same test keeps the same ID across runs.

## Read the results

The results document has `summary` (pass/fail counts per level) and `specs[].tests[].contexts[].steps[]` entries. For failures, read `resultDescription` on steps with `result: "FAIL"` and map back to documentation sections. Steps after a failure in the same context report `result: "SKIPPED"`.

By default, the run also saves a screenshot after each step that drives a browser, app, or device, and a recording of each such context. They're in the run folder that the results' `runDir` names. Look at the screenshot of a failed step to see what the page showed.

| Error | Likely cause |
|---|---|
| "No elements matched selector or text." | Text changed, element removed, wrong selector, page slow to load |
| "Couldn't open URL" or "Invalid or unresolvable URL" | URL changed, server down, auth required |
| "Returned 404. Expected one of [200,201]." | API endpoint changed, auth issue |

## Fix failing tests

When the user wants failing tests fixed, use the fix-tests tool. It analyzes failures, proposes fixes with confidence scores, and runs the tests again. Read `references/fix-failing-tests.md` before you fix tests. It covers the fix options, failure analysis patterns, and confidence scoring.

## Done when

Before you return a spec:

- No step has an `"action":` property.
- Steps match on text, except where the selector rule above calls for a selector.
- The spec has a `tests` array, and each test has a `testId` and `steps`.
- A validator ran, and its output shows `Validation PASSED`.
- If the fallback script validated the spec, `npx doc-detective@5 validate` also exited `0`, or it failed with an unknown-command error.

## External resources

- Main docs: https://docs.doc-detective.com
- Test structure: https://docs.doc-detective.com/docs/get-started/how-testing-works
- Actions: https://docs.doc-detective.com/docs/get-started/concepts#action
- GitHub: https://github.com/doc-detective/doc-detective

## Scripts

- `scripts/doc-detective-validate-test.js`: Validates test specs. Run it before you return a spec.
- `scripts/fix-tests.js`: Analyzes failures and proposes fixes.
