---
name: doc-detective-test
description: 'Run Doc Detective tests to check that documented procedures still work as written, from a doc file, an existing spec, or docs with inline tests, and optionally fix failing tests. Use for test my docs, verify these steps, or run-and-fix requests. To write a spec without running it, use doc-detective-generate. Not for Playwright, unit, or app end-to-end tests, or for testing Doc Detective itself.'
metadata:
  version: '3.2.0'
  organization: Doc Detective
  date: November 2026
  abstract: Convert documentation procedures into executable Doc Detective test specifications, run them, fix failures, and verify the documentation matches actual behavior.
  references: https://docs.doc-detective.com, https://github.com/doc-detective/doc-detective
  user-invocable: 'true'
user-invocable: true
---

# Test Documentation Command

**Skill:** `doc-detective:doc-detective-test`

## Goal

Tell the user whether their documented procedures work as written. Turn the procedures into Doc Detective tests, run them, and report each test's result with the reason for each failure. The user decides from this report which docs or tests to fix, so the counts and reasons must match the results file. With `--fix`, also try to repair failing tests. With `--inject`, put the passing tests into the source file.

For documentation and web UI testing, use Doc Detective rather than Playwright. To inject tests without running them, use `/doc-detective-inline`.

## Usage

```
/doc-detective-test <doc-file | spec-file | text> [options]
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--fix` | `false` | Enable fix loop for failing tests |
| `--auto-fix` | `false` | Apply all fixes without confirmation |
| `--fix-threshold <n>` | `80` | Confidence threshold (0–100) for auto-applying fixes |
| `--max-fix-attempts <n>` | `3` | Maximum fix iterations per failing test |
| `--inject` | `false` | Inject passing tests into source file after completion |
| `--auto-screenshot` | - | Pass `--auto-screenshot` to Doc Detective to turn on auto screenshots that the config file turns off |
| `--no-auto-screenshot` | - | Pass `--no-auto-screenshot` to Doc Detective to turn off the screenshot it captures after every step that drives a browser, app, or device |

```
/doc-detective-test docs/login.md --fix
/doc-detective-test docs/login.md --fix --auto-fix
/doc-detective-test docs/login.md --fix --fix-threshold 60
/doc-detective-test docs/login.md --fix --inject
/doc-detective-test docs/login.md --no-auto-screenshot
```

## Guardrails

- **Run only a spec that passed `/doc-detective-validate`.** An invalid spec produces no usable results. When validation fails, report `Error: generated spec failed validation: <errors>`. With `--fix`, fix the field the error names, and validate again.
- **Report results as the results file records them.** Record each test's `specs[].tests[].result` as written: `PASS`, `WARNING`, `SKIPPED`, or `FAIL`. Don't infer results from the exit code alone. The user acts on these results, so a count that's wrong sends them to the wrong docs.
- **Never copy a masked value into a spec.** A `***NAME***` value in the results is a masked variable that the step ran with. Keep the spec's `$NAME` reference. The masked text isn't the real value, so a spec that contains it tests the wrong input.
- **Below the threshold, ask before you apply a fix.** Without `--auto-fix`, show any fix whose confidence is below `--fix-threshold`, with its score, and apply it only when the user approves. A fix changes what the test checks, and a wrong fix can hide a real documentation problem.
- **Inject only with `--inject`, and only tests whose result is `PASS`.** Injection edits the user's documentation source. An injected test that fails makes every later scan of the docs fail too.
- **Stop with a clear error when there's nothing to test.** Use the matching message:
  - No input: `Error: no documentation input provided`.
  - A file that can't be opened: `Error: file not found: <path>`.
  - A generated spec with no tests: `Error: no testable procedures found in <input>`.
  - When generation fails, report the error from `/doc-detective-generate`.

## Get a valid spec

The input is a file path or inline text. For inline text, use it directly without reading from disk.

- **A spec file** (JSON or YAML with a `tests` array). Validate it with `/doc-detective-validate`, and run it as is.
- **A doc that already contains inline tests** (`<!-- test ... -->` comments or their equivalents). Run the doc directly. Doc Detective reads the inline tests.
- **Any other doc or text.** Pass it to `/doc-detective-generate` to build the spec, and then validate the spec with `/doc-detective-validate`.

## Run the tests

Write the results to a file. When the user set `--auto-screenshot` or `--no-auto-screenshot`, pass the same flag to Doc Detective. Use the first runner that's available:

```bash
# 1. Global CLI
doc-detective --input <spec-file> --output <results-file>
# 2. Docker
docker run -v "$(pwd):/app" docdetective/docdetective --input /app/<spec-file> --output /app/<results-file>
# 3. npx
npx doc-detective@5 --input <spec-file> --output <results-file>
```

These specs need Doc Detective 5 or later. Move to the next runner when a command isn't available, or when its `--version` reports a version below 5. When none is available, tell the user and suggest installing one.

The exit code tells you whether the results file is worth reading:

- `0`: No test failed, and at least one passed or warned.
- `1`: At least one test failed. This is a normal outcome, not a crash. The results file is written.
- `2`: Nothing valid was tested, or the CLI couldn't proceed. Report the error from stderr. With `--fix` and an invalid field, fix it as [Fix failing tests](#fix-failing-tests) describes. Otherwise stop without fixing or injecting. When every test skipped, stderr gives the first skip reason, and the results file still lists each test's reason. Report those skips as skips, not failures.

Take each failure reason from `resultDescription` on the steps in `specs[].tests[].contexts[].steps[]` whose `result` is `FAIL`. Steps after a failure in the same context report `SKIPPED`. The screenshot of a failed step, in the run folder that the results' `runDir` names, shows what the page looked like.

| Error | Likely cause |
|---|---|
| "Couldn't find element ..." or "Couldn't find an element within `timeout` ..." | Text changed, element removed, wrong selector, page slow to load |
| "Couldn't open URL" or "Invalid or unresolvable URL" | URL changed, server down, auth required |
| "Returned 404. Expected one of [200,201]." | API endpoint changed, auth issue |

## Fix failing tests

Fix tests only when the user set `--fix`. Without it, report each failing test with its failure reason.

`--fix` repairs tests, not docs or the environment. Before you change anything, decide where each failure belongs:

- **The test is wrong.** The test disagrees with its own doc. Examples are a typo, a wrong selector, a host or port the doc doesn't name, and an expected value the doc contradicts. Fix the test so it checks what the doc says. A value the doc doesn't state, such as a status code, is different. When the response breaks it, the product may be failing, so report it.
- **The doc is out of date.** The doc and its test agree, and the page doesn't. The product changed, or it regressed. Don't edit the doc or the test, even when a one-word change would make it pass. A test bent to match the page stops catching the stale doc. Report what the doc says, what the page shows, and the doc edit you propose, and ask before you make it, even with `--auto-fix`.
- **The environment is down.** A connection to the host and port the doc names is refused, or the server doesn't answer. Don't edit anything, and don't point the test at another host or port. Report which service is down, and how to start it when the repo's README or config says so.
- **A test skipped by design.** A `runOn` that excludes this platform skips the test. That's not a failure, so don't change `runOn`.
- **An invalid field.** Doc Detective exits `2` and names the field. Fix that field in the test, validate the spec again, and run it.

When one run has failures of different kinds, handle each one by its kind.

The bundled fix tool analyzes a results file and proposes fixes with confidence scores: `node skills/doc-detective-test/scripts/fix-tests.js <results-file> --spec <spec-file> --dry-run`. It reads and writes JSON specs only, so apply a fix to a YAML spec by hand. Read [references/fix-failing-tests.md](references/fix-failing-tests.md) for its options, failure patterns, and confidence scoring.

For each test that failed because the test is wrong or has an invalid field, try fixes until the test passes or you reach `--max-fix-attempts`. Handle the other kinds as the list above says:

- Analyze the failure, and propose a fix with a confidence score from 0 to 100. The score is how sure you are that the fix resolves the failure.
- With `--auto-fix`, or with confidence at or above `--fix-threshold`, apply the fix to the spec. Otherwise follow the guardrail above. A fix the user declines still counts as an attempt.
- Run the test again, and read the results file again. Exit `1` means the test still fails. Exit `2` means nothing valid ran, because the fix made the spec invalid or every test skipped. Check stderr, and then revert or correct the fix.

Mark a test that still fails after the last attempt as `unresolved`.

## Inject passing tests

With `--inject`, inject when no test failed, or when the fix loop has finished. When tests fail and `--fix` isn't set, report the failures and don't inject. Run `/doc-detective-inline <spec-file> <source-file> --apply` with a spec that holds only the tests whose result is `PASS`. The user's `--inject` is the confirmation that `--apply` asks for. When every test remains unresolved, skip injection. When injection fails, report `Error: injection failed: <reason>`.

## Report

- With no failures: `<n> passed, <n> warned, <n> skipped.` After a successful injection, add `Injected into <path>.`
- With failures and no `--fix`: each failing test with its failure reason.
- After the fix loop, the pass count, fail count, unresolved count, and each unresolved failure reason.

Example, for `/doc-detective-test docs/login.md` against a login procedure:

```
Results: 2 passed, 2 failed
  ✗ signin: Couldn't find element `Sign in`.
  ✗ verify: Couldn't open URL
Run with --fix to attempt automatic repairs.
```

## Done when

- Every test in the spec ran, and its result is recorded.
- With `--fix`, each failing test passed or is marked `unresolved`.
- With `--inject`, the passing tests are in the source file, or the report says why they aren't.
- The pass, warn, skip, and fail counts match the results file.

## Run output reference

### Per-run artifact folders

Each test run archives its results, screenshots, and recordings in a dedicated folder at `<outputDir>/.doc-detective/runs/<runId>/`. The `runFolder` reporter (on by default) writes `testResults.json` there. The results' `runDir` names the folder.

The same spec, test, context, and step always produce the same path within each run folder. Diff two run folders to spot changes over time.

### Auto screenshots

`autoScreenshot` defaults to `true`. Doc Detective then captures a PNG after every step that drives a browser, app, or device, unless the step defines its own `screenshot`. `--no-auto-screenshot` or `autoScreenshot: false` turns it off. Screenshots are saved to the per-run artifact folder at paths like:

```
.doc-detective/runs/<runId>/specs/<specId>/tests/<testId>/contexts/<contextId>/screenshots/01-goTo-s4f2a91c.png
```

The file name is the step's position within the test (`01`), its action (`goTo`), and its `stepId` with the leading `<testId>~` removed (`s4f2a91c`). Because the path derives from spec, test, context, and step IDs, the same step lands on the same relative path within each run folder.

Auto screenshots can be configured at three levels with test > spec > config precedence:

| Level | Config key | Effect |
|-------|------------|--------|
| Config | `autoScreenshot: false` | Applies to all tests |
| Spec | `autoScreenshot: false` on spec object | Applies to all tests in the spec |
| Test | `autoScreenshot: false` on test object | Applies to this test only |

A value at a lower level overrides the level above it, so a test can set `autoScreenshot: true` to turn screenshots back on. Unset values defer to the next level up.

### Stable IDs

Doc Detective generates stable fallback IDs so the same spec, test, context, or step keeps the same ID across runs:

| ID | Fallback derivation |
|----|---------------------|
| `specId` | Relative file path |
| `testId` | `<specId>~<hash>` of the test definition |
| `contextId` | `<platform>-<browser>`, or `default` |
| `stepId` | `<testId>~s<hash>` of the step definition |

Explicit IDs in your specs always take precedence. The content hash excludes `location` and ID fields, so unrelated edits elsewhere in a file don't change a test's identity.

## Related commands

- `/doc-detective-generate`: Generate test specs without running them.
- `/doc-detective-validate`: Validate an existing test spec.
- `/doc-detective-inline`: Inject passing test specs into source files.
