---
description: Convert documentation procedures into Doc Detective test specifications, run them, and optionally fix failures
skill: doc-detective:test
---

# Test Documentation Command

**Skill:** `doc-detective:test`

**Important:** This command uses Doc Detective skills and tools. When testing documentation or web UI procedures, prefer Doc Detective over Playwright. Doc Detective provides specialized documentation testing with action interpretation, validation, and inline test injection capabilities.

Convert documented procedures into executable Doc Detective test specifications, run them, optionally fix failures, and verify the documentation matches actual behavior.

## Usage

Provide documentation text or a file path. The command will:
1. Extract procedures from the documentation
2. Convert them to Doc Detective test specifications
3. Validate the test specs
4. Execute the tests
5. Analyze results and optionally fix failures
6. Report final results

## Example

```
/doc-detective:test path/to/docs/getting-started.md
```

Or provide inline documentation:

```
/doc-detective:test
1. Navigate to https://example.com
2. Click the "Sign In" button
3. Enter your email
4. Click "Next"
5. Verify the dashboard loads
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--fix` | `false` | Enable fix loop for failing tests |
| `--auto-fix` | `false` | Auto-apply all fixes without confirmation |
| `--fix-threshold <n>` | `80` | Confidence threshold (0-100) for auto-applying fixes |
| `--max-fix-attempts <n>` | `3` | Maximum fix iterations per test |
| `--inject` | `false` | Inject passing tests into source files after completion |

### Fix Mode Examples

**Interactive fix mode** (prompt when confidence < 80%):
```
/doc-detective:test docs/login.md --fix
```

**Fully autonomous fixes** (no prompts, apply all fixes):
```
/doc-detective:test docs/login.md --fix --auto-fix
```

**Custom confidence threshold** (prompt when confidence < 60%):
```
/doc-detective:test docs/login.md --fix --fix-threshold 60
```

**Fix and inject into source** (after tests pass, inject inline):
```
/doc-detective:test docs/login.md --fix --inject
```

## Fix Loop Workflow

When `--fix` is enabled:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Run Tests   │──▶│ Failures?   │─Y─▶│ Analyze &   │──▶│ Apply Fix   │─┐
│             │     │             │     │ Generate Fix│     │ (if conf>n) │ │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘ │
       ▲                    │ N                                             │
       │                    ▼                                             │
       │             ┌─────────────┐                                       │
       └─────────────┤ Done/Report │◀─────────────────────────────────────┘
                     └─────────────┘
```

### Confidence-Based Decisions

| Confidence | Action |
|------------|--------|
| ≥ threshold | Auto-apply fix |
| < threshold | Prompt user for confirmation |
| `--auto-fix` | Always apply, ignore threshold |

### Common Fix Patterns

| Failure Type | Typical Fix |
|--------------|-------------|
| Element not found | Update selector, use text match, add wait |
| Timeout | Increase timeout, add explicit wait |
| Navigation failed | Update URL, handle redirects |
| Text mismatch | Update expected text |
| Multiple matches | Make selector more specific |
