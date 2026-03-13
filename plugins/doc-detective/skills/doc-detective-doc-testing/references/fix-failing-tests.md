# Fix Failing Tests

When tests fail, analyze the failures and generate fixes with confidence scores.

## Fix Tool

Use the fix-tests tool to analyze failures and propose fixes:

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
| `--fix` | `false` | Enable automatic fix attempts |
| `--auto-fix` | `false` | Apply all fixes without prompting |
| `--threshold` | `80` | Confidence threshold (0-100) for auto-apply |
| `--max-iterations` | `3` | Maximum fix iterations per test |

## Failure Analysis

For each failing step, analyze:

1. **Error type**: Element not found, timeout, navigation failure, assertion failure
2. **Context**: What the step was trying to do
3. **Actual result**: What happened instead
4. **Potential causes**: Why it might have failed

```json
{
  "failureAnalysis": {
    "stepId": "click-submit",
    "errorType": "element_not_found",
    "action": "click",
    "target": "Submit",
    "resultDescription": "Element 'Submit' not found within timeout",
    "potentialCauses": [
      "Button text changed",
      "Element not yet visible",
      "Different selector needed"
    ]
  }
}
```

## Generate Fix with Confidence Score

Based on failure analysis, generate a fix and calculate confidence:

```json
{
  "fix": {
    "stepId": "click-submit",
    "originalStep": { "click": "Submit" },
    "fixedStep": { "click": "Submit Form" },
    "confidence": 85,
    "reasoning": "Page contains button with text 'Submit Form' which matches the intent"
  }
}
```

**Confidence scoring factors:**
- **High (80-100)**: Exact alternative found, clear pattern match
- **Medium (50-79)**: Partial match, likely correct but uncertain
- **Low (0-49)**: Best guess, significant uncertainty

## Apply Fix Decision

With `--auto-fix`, apply all fixes automatically. Otherwise, apply fixes at or above `--fix-threshold` automatically; prompt user for confirmation on lower-confidence fixes.

## Fix History Tracking

Track fix attempts for reporting. Each entry records the step, original/fixed values, confidence, and result:

```json
{
  "fixHistory": [
    { "attempt": 1, "stepId": "click-submit", "original": { "click": "Submit" }, "fixed": { "click": "Submit Form" }, "confidence": 85, "result": "PASS" },
    { "attempt": 1, "stepId": "find-welcome", "original": { "find": "Welcome" }, "fixed": { "find": "Welcome back" }, "confidence": 45, "result": "FAIL", "note": "Needs manual review" }
  ]
}
```

## Re-run and Iterate

Save updated spec → run validator → execute tests → check results. If all pass, report success. If still failing, iterate up to max attempts, then report "needs manual review."

## Common Fix Patterns

| Failure | Fix Strategy | Typical Confidence |
|---------|--------------|-------------------|
| Element text changed | Search page for similar text | 70-90% |
| Element not visible | Add wait step before action | 80-95% |
| Timeout | Increase timeout value | 90% |
| Selector invalid | Switch to text-based match | 75-85% |
| Navigation redirect | Update URL to final destination | 85-95% |
| Multiple matches | Add more specific context | 60-80% |

## Fix Mode Integration

When `--fix` is enabled in the test command:

```bash
# Interactive fix (prompt when confidence < 80%)
/doc-detective:test docs/guide.md --fix

# Fully autonomous (apply all fixes)
/doc-detective:test docs/guide.md --fix --auto-fix

# Custom threshold (prompt when confidence < 60%)
/doc-detective:test docs/guide.md --fix --fix-threshold 60
```
