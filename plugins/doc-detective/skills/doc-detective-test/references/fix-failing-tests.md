# Fix Failing Tests

When tests fail, analyze the failures and generate fixes with confidence scores.

## Fix Tool

Use the fix-tests tool to analyze failures and propose fixes. It reads the file that `doc-detective --output results.json` writes, and takes each failure from `specs[].tests[].contexts[].steps[]` where `result` is `FAIL`. Doc Detective exits `1` when a test fails, and still writes that file.

```bash
# Analyze failures and show proposed fixes (dry-run)
node ./scripts/fix-tests.js results.json --spec test-spec.json --dry-run

# Apply fixes above 80% confidence threshold
node ./scripts/fix-tests.js results.json --spec test-spec.json --threshold 80

# Apply all fixes regardless of confidence
node ./scripts/fix-tests.js results.json --spec test-spec.json --auto-fix
```

## Fix Loop Workflow

Analyze failure → Generate fix → Calculate confidence → Apply/Prompt → Re-run tests → Pass (done) or Fail (loop, max 3 attempts)

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

With `--auto-fix`, apply all fixes. Otherwise, apply fixes at or above `--threshold` (`--fix-threshold` in `/doc-detective-test`), and ask the user before you apply a lower-confidence fix.

Record each attempt (the step, the original and fixed step, the confidence, and the result) so the report can list the failures that remain.

## Re-run and Iterate

Save updated spec → run validator → execute tests → read the results file (exit `1` means tests failed, not that the run crashed). If all pass, report success. If still failing, iterate up to max attempts, then report "needs manual review."

## Common Fix Patterns

| Failure | Fix Strategy | Typical Confidence |
|---------|--------------|-------------------|
| Element text changed | Search page for similar text | 70-90% |
| Element not visible | Add a `find` step with `timeout` before the action | 80-95% |
| Timeout | Increase timeout value | 90% |
| Selector invalid | Switch to text-based match | 75-85% |
| Navigation redirect | Update URL to final destination | 85-95% |
| Multiple matches | Add more specific context | 60-80% |

## Fix Mode Integration

When `--fix` is enabled in the test command:

```bash
# Interactive fix (prompt when confidence < 80%)
/doc-detective-test docs/guide.md --fix

# Fully autonomous (apply all fixes)
/doc-detective-test docs/guide.md --fix --auto-fix

# Custom threshold (prompt when confidence < 60%)
/doc-detective-test docs/guide.md --fix --fix-threshold 60
```

## Environment and Configuration Troubleshooting

When failures stem from environment or configuration issues rather than test logic, use the `debug` subcommand to gather diagnostic information.

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
