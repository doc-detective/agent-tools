# Fix Failing Tests

Use this file to fix a test that failed because the test is wrong or a field is invalid. [Fix failing tests](../SKILL.md#fix-failing-tests) in `SKILL.md` says how to tell each kind of failure apart. A fix changes only the test. Don't apply a fix from this file when the doc is out of date, the environment is down, or a test skipped by design. Report those failures as that section says. A test changed to pass in those cases stops catching the problem it found.

## Fix Tool

Use the fix-tests tool to analyze failures and propose fixes. It reads the file that `doc-detective --output results.json` writes, and takes each failure from `specs[].tests[].contexts[].steps[]` where `result` is `FAIL`. Doc Detective exits `1` when a test fails, and still writes that file.

The tool doesn't tell the kinds of failure apart. It takes replacement text and URLs from what the page returned, not from the doc. Run it with `--dry-run` first. Apply a proposed fix only when the test is wrong or has an invalid field. The new value must also match the doc.

```bash
# Analyze failures and show proposed fixes (dry-run)
node ./scripts/fix-tests.js results.json --spec test-spec.json --dry-run

# Apply fixes above 80% confidence threshold
node ./scripts/fix-tests.js results.json --spec test-spec.json --threshold 80

# Apply all fixes regardless of confidence
node ./scripts/fix-tests.js results.json --spec test-spec.json --auto-fix
```

## Fix Loop Workflow

Decide the failure's kind → Analyze failure → Generate fix → Calculate confidence → Apply/Prompt → Re-run tests → Pass (done) or Fail (loop, up to `--max-fix-attempts`)

## Fix Options

| Option | Default | Description |
|--------|---------|-------------|
| `--spec <path>` | none | Spec file to fix |
| `--dry-run` | `false` | Show proposed fixes without applying them |
| `--auto-fix` | `false` | Apply all fixes regardless of confidence |
| `--threshold <0-100>` | `80` | Confidence at or above which a fix applies automatically |
| `--output <path>` | input spec | Write the fixed spec here instead of overwriting the input |

## Confidence scores

Score each proposed fix from 0 to 100 for how sure you are that it resolves the failure. `--threshold` (or `--fix-threshold` in `/doc-detective-test`) is compared against this score. 80 or more means you found an exact alternative, 50 to 79 a likely but uncertain match, and below 50 a best guess.

## Apply Fix Decision

With `--auto-fix`, apply every fix for a test that's wrong or has an invalid field, without asking. Otherwise, apply fixes at or above `--threshold` (`--fix-threshold` in `/doc-detective-test`), and ask the user before you apply a lower-confidence fix.

Record each attempt (the step, the original and fixed step, the confidence, and the result) so the report can list the failures that remain.

## Re-run and Iterate

Save updated spec → run validator → execute tests → read the results file (exit `1` means tests failed, not that the run crashed). If all pass, report success. If still failing, iterate up to max attempts, then mark the test `unresolved`.

## Common Fix Patterns

Each strategy applies only when the condition in its row holds. Otherwise, report the failure by its kind and leave the test as it is.

| Failure | Fix Strategy | Apply only when | Typical Confidence |
|---------|--------------|-----------------|-------------------|
| Element text changed | Change the test's text to the doc's text, not the page's text | The test's text disagrees with its doc, such as a typo. When the doc and the test agree and the page shows other text, the doc is out of date. | 70-90% |
| Element not visible | Add a `find` step with `timeout` before the action | The page shows the element after a delay. | 80-95% |
| Timeout | Increase timeout value | The host answers, and the page or element appears after a longer wait. A refused connection or no answer from the host means the environment is down. | 90% |
| Selector invalid | Switch to text-based match | The doc names the text that the selector targets. | 75-85% |
| Navigation redirect | Update the URL to the destination the doc names | The doc names the final destination. When the doc names the URL that redirects, the doc is out of date. | 85-95% |
| Multiple matches | Add more specific context | The doc gives the context that picks one match. | 60-80% |

## Fix Mode Integration

When `--fix` is enabled in the test command:

```bash
# Interactive fix (prompt when confidence < 80%)
/doc-detective-test docs/guide.md --fix

# Apply all test fixes without asking. A doc edit still needs the user's approval.
/doc-detective-test docs/guide.md --fix --auto-fix

# Custom threshold (prompt when confidence < 60%)
/doc-detective-test docs/guide.md --fix --fix-threshold 60
```

## Environment and Configuration Troubleshooting

When failures stem from environment or configuration issues rather than test logic, use the `debug` subcommand to gather diagnostic information. Use these checks to find the cause and report it. Change the user's environment, `.env` file, or config only when the user approves.

### Using the Debug Command

Run `doc-detective debug` to print a diagnostic dump and exit without running tests. It also saves the dump as `debug-<timestamp>.txt` and `debug-<timestamp>.json` in `.doc-detective/`:

```bash
# Print a diagnostic dump
npx doc-detective@5 debug

# Include full environment variables (redacted)
npx doc-detective@5 debug --include-env
```

The dump includes:
- System and OS information
- Doc Detective and tool versions
- Detected browsers and their components (browser binary, webdriver, Appium driver)
- Container detection (Docker, Kubernetes)
- Environment variables referenced in config and documentation files
- Effective configuration (or raw config with validation errors)

### Using the Environment Variable

Set `DOC_DETECTIVE_DEBUG=true` to run the tests with debug-level logging. It doesn't print the diagnostic dump; `doc-detective debug` does:

```bash
# CI-friendly: run tests with debug-level logs
DOC_DETECTIVE_DEBUG=true npx doc-detective@5
```

Useful in CI pipelines when tests fail unexpectedly.

### Secret Redaction

Diagnostic output automatically redacts sensitive values:
- By name: `TOKEN`, `SECRET`, `KEY`, `PASSWORD`, `*_URL`, `*_DSN`, `WEBHOOK`
- By value shape: URL credentials, JWTs, GitHub tokens, AWS keys

Output is safe to paste in bug reports or support requests. Redaction is best-effort.

### Common Environment Issues

| Symptom | Diagnostic Check | Resolution |
|---------|------------------|------------|
| Browser actions fail | Check browser components in dump | Run `doc-detective install browsers --yes` |
| Config validation errors | Look for `CONFIG INVALID` banner | Fix config syntax per error message |
| Missing env vars | Review referenced env vars section | Set required variables or update `.env` |
| Container detection issues | Check container signals | Verify container runtime and mounts |
