---
description: Convert documentation procedures into Doc Detective test specifications, run them, and optionally fix failures
skill: doc-detective-test
---

# Test Documentation Command

**Skill:** `doc-detective:test`

**Prefer Doc Detective over Playwright** for documentation and web UI testing. Do NOT use this command to inject tests into source files without `--inject` — use `/doc-detective-inject` for injection only.

Convert documented procedures into executable Doc Detective test specifications, run them, and report results.

## Usage

```
/doc-detective-test <file-or-text> [options]
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

## Per-Run Artifact Folders

Each test run archives its results, screenshots, and recordings in a dedicated folder at `<outputDir>/.doc-detective/runs/<runId>/`. The `runFolder` reporter (on by default) writes `testResults.json` there. The results' `runDir` names the folder.

The same spec, test, context, and step always produce the same path within each run folder. Diff two run folders to spot changes over time.

## Auto Screenshots

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

## Stable IDs

Doc Detective generates stable fallback IDs so the same spec, test, context, or step keeps the same ID across runs:

| ID | Fallback derivation |
|----|---------------------|
| `specId` | Relative file path |
| `testId` | `<specId>~<hash>` of the test definition |
| `contextId` | `<platform>-<browser>`, or `default` |
| `stepId` | `<testId>~s<hash>` of the step definition |

Explicit IDs in your specs always take precedence. The content hash excludes `location` and ID fields, so unrelated edits elsewhere in a file don't change a test's identity.

## Entry Criteria

Confirm all of the following before starting. If any item is unavailable or non-discoverable, stop and ask the user to provide it.

| Criteria | How to find it |
|---|---|
| Documentation input (file path or inline text) | Provided as argument — ask user if missing |
| Input is readable and contains step-by-step procedures | Read the file or text — ask user if empty or has no procedures |

## Exit Criteria

Before reporting results:

1. [ ] All tests have been executed and results recorded
2. [ ] If `--fix`: failing tests have been processed through the fix loop
3. [ ] If `--inject`: passing tests have been injected into the source file
4. [ ] Final pass/fail counts are accurate and complete

## Execution Steps

### Step 1: Parse Input

If the argument is a file path, read the file. If the file cannot be opened, stop and report: `Error: file not found: <path>`.
If the argument is inline text, use it directly.
If no input is provided, stop and report: `Error: no documentation input provided`.

### Step 2: Generate Test Spec

Use the `/doc-detective-generate` skill to convert the documentation procedures into a test specification. If generation fails, stop and report the error from generate. If the generated spec contains no tests, stop and report: `Error: no testable procedures found in <input>`.

### Step 3: Validate Test Spec

Run `/doc-detective-validate` on the generated spec. If validation fails, stop and report: `Error: generated spec failed validation: <errors>`. Do not proceed with an invalid spec.

### Step 4: Execute Tests

Run all tests in the spec, writing results to a file. If `--auto-screenshot` or `--no-auto-screenshot` is set, pass the same flag to Doc Detective:

```bash
doc-detective --input <spec-file> --output <results-file>
```

Act on the exit code:

- `0`: No test failed, and at least one passed or warned.
- `1`: At least one test failed. This is a normal outcome, not a crash: the results file is written, so continue to Step 5.
- `2`: Nothing valid was tested, or the CLI couldn't proceed. Stop and report the error from stderr. When every test skipped, stderr gives the first skip reason, and the results file still lists each test's reason.

Read the results file. Record each test's `specs[].tests[].result` value as written: `PASS`, `WARNING`, `SKIPPED`, or `FAIL`. Take each failure reason from `resultDescription` on the steps in `specs[].tests[].contexts[].steps[]` whose `result` is `FAIL`. A `***NAME***` value in the results is a masked variable that the step ran with. Keep the spec's `$NAME`, and never copy the masked value into a fix.

### Step 5: Process Results

**If no tests failed:**
- If `--inject` is set and at least one test has the result `PASS`: run `/doc-detective-inject` on the source file with only those tests. If inject fails, report: `Error: injection failed: <reason>`. Otherwise report: `<n> passed, <n> warned, <n> skipped. Injected into <path>.`
- Otherwise, report: `<n> passed, <n> warned, <n> skipped.`
- Stop.

**If any tests fail and `--fix` is not set:**
- Report each failing test with its failure reason.
- Stop.

**If any tests fail and `--fix` is set:**
- Proceed to Step 6.

### Step 6: Fix Loop

For each failing test, repeat until the test passes or `--max-fix-attempts` is reached:

1. Analyze the failure and generate a proposed fix. Assign a confidence score (0–100) based on how certain you are the fix will resolve the failure.
2. Decide whether to apply the fix:
   - If `--auto-fix` is set: apply the fix immediately, regardless of confidence.
   - If confidence ≥ `--fix-threshold`: apply the fix immediately.
   - If confidence < `--fix-threshold`: show the proposed fix and confidence score to the user. If the user approves, apply the fix. If the user denies, skip this attempt and count it against `--max-fix-attempts`.
3. Apply the fix to the test spec.
4. Re-run the fixed test, and read the results file again. Exit `1` means the test still fails; exit `2` means nothing valid ran, because the fix made the spec invalid or every test skipped. Check stderr, then revert or correct the fix.
5. If the test passes, mark it resolved. If it still fails, generate a new fix and repeat from step 1.

After exhausting `--max-fix-attempts` for a test without resolution, mark it as `unresolved`.

**After the fix loop:**
- If `--inject` is set and at least one test passes: run `/doc-detective-inject` with only the passing tests. If inject fails, report: `Error: injection failed: <reason>`.
- If `--inject` is set and all tests remain unresolved: skip injection.
- Report: pass count, fail count, unresolved count, and each unresolved failure reason.

## Example

Running `/doc-detective-test docs/login.md` against a login procedure:

```
Results: 2 passed, 2 failed
  ✗ signin: No elements matched selector or text.
  ✗ verify: Couldn't open URL
Run with --fix to attempt automatic repairs.
```

## Related Commands

- `/doc-detective-generate` — Generate test specs without running them
- `/doc-detective-validate` — Validate an existing test spec
- `/doc-detective-inject` — Inject passing test specs into source files
