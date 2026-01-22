---
name: doc-detective-testing
description: Test documentation procedures using Doc Detective (doc-detective.com). Use when (1) testing procedures in markdown/text documentation, (2) converting documentation into executable test specifications, (3) validating existing Doc Detective test specs, (4) running Doc Detective tests and interpreting results, or (5) checking if documented procedures match actual application behavior. Triggers on requests to "test documentation", "verify procedures", "run doc-detective", or "create tests from docs".
---

# Doc Detective Testing

Test documentation procedures by converting them to Doc Detective test specifications and executing them.

## Workflow

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│ 1. Interpret    │────▶│ 2. Validate  │────▶│ 3. Execute  │────▶│ 4. Analyze  │
│ (docs → spec)   │     │ (check spec) │     │ (run tests) │     │ (results)   │
└─────────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
```

## 1. Text-to-Test Interpretation

Convert documentation procedures into test specifications.

### Identify Procedures

Scan documentation for step-by-step processes. Each distinct procedure becomes a test.

### Map Actions to Steps

| Documentation describes | Doc Detective action |
|---|---|
| Navigate to URL | `goTo` |
| Click/tap element | `click` (prefer text) |
| Find/verify element | `find` (prefer text) |
| Type text | `type` |
| API call | `httpRequest` |
| Screenshot | `screenshot` |
| Shell command | `runShell` |
| Wait/pause | `wait` |
| Check link | `checkLink` |

**Prefer text over selectors.** When docs say "Click Submit", use `{ "click": "Submit" }` not a CSS selector.

### Generate Test Specification

```json
{
  "tests": [
    {
      "testId": "login-flow",
      "description": "Verify login procedure from documentation",
      "steps": [
        {
          "stepId": "nav-login",
          "description": "Navigate to login page",
          "goTo": "https://example.com/login"
        },
        {
          "description": "Verify login form visible",
          "find": "Sign In"
        },
        {
          "description": "Enter username",
          "type": {
            "keys": "testuser",
            "selector": "#username"
          }
        },
        {
          "description": "Enter password",
          "type": {
            "keys": "password123",
            "selector": "#password"
          }
        },
        {
          "description": "Submit login",
          "click": "Sign In"
        },
        {
          "description": "Verify dashboard loads",
          "find": "Dashboard"
        }
      ]
    }
  ]
}
```

### Text-Based Element Location

Match documentation language directly:

| Documentation | Test step |
|---|---|
| "Click the **Submit** button" | `{ "click": "Submit" }` |
| "Verify **Welcome** appears" | `{ "find": "Welcome" }` |
| "Tap **Next**" | `{ "click": "Next" }` |
| "Look for **Dashboard**" | `{ "find": "Dashboard" }` |

Use selectors only when:
- Documentation provides explicit selectors
- Multiple elements have same text
- Element has no visible text (icon buttons)

## 2. Validate Before Execution

Always validate test specs before running. Use `scripts/validate-test.js`:

```bash
node scripts/validate-test.js test-spec.json
```

Or validate inline with stdin:

```bash
echo '{"tests":[...]}' | node scripts/validate-test.js --stdin
```

**Validation modes:**
- **Structural validation** (default) - Validates structure and known actions without dependencies
- **Schema validation** - Full JSON schema validation when `doc-detective-common` is installed

Validation checks:
- Required `tests` array exists (non-empty)
- Each test has `steps` array (non-empty)
- Each step has a known action
- Action parameters match expected types

**Do not execute tests that fail validation.**

## 3. Execute Tests

### Check Available Methods

```bash
# Check for global install
which doc-detective

# Check for Docker
docker --version

# Check for npx
which npx
```

### Execution Fallback Chain

**Primary** - Global CLI:
```bash
doc-detective run --input test-spec.json
```

**Secondary** - Docker:
```bash
docker run -v "$(pwd):/app" docdetective/doc-detective:latest run --input /app/test-spec.json
```

**Tertiary** - NPX:
```bash
npx doc-detective run --input test-spec.json
```

If none available, inform user Doc Detective cannot run and suggest installation.

### Common Options

```bash
# Specify output directory
doc-detective run --input test-spec.json --output ./results

# Run in headless mode (default)
doc-detective run --input test-spec.json

# Run with visible browser
doc-detective run --input test-spec.json --headless false

# Test specific files/directories
doc-detective run --input ./docs/

# Use config file
doc-detective run --config doc-detective.json
```

## 4. Analyze Results

Doc Detective outputs `testResults-<timestamp>.json`:

```json
{
  "summary": {
    "specs": { "pass": 1, "fail": 0 },
    "tests": { "pass": 2, "fail": 1 },
    "steps": { "pass": 8, "fail": 2 }
  },
  "specs": [
    {
      "id": "test-spec",
      "tests": [
        {
          "testId": "login-flow",
          "status": "PASS",
          "steps": [
            {
              "status": "PASS",
              "action": "goTo",
              "resultDescription": "Navigated to https://example.com/login"
            },
            {
              "status": "FAIL",
              "action": "find",
              "resultDescription": "Element 'Sign In' not found within timeout"
            }
          ]
        }
      ]
    }
  ]
}
```

### Interpret Results

1. Check `summary` for overall pass/fail counts
2. For failures, examine `specs[].tests[].steps[]` with `status: "FAIL"`
3. Read `resultDescription` for error details
4. Map failures back to documentation sections

### Common Failure Patterns

| Error | Likely cause |
|---|---|
| "Element not found" | Text changed, element removed, wrong selector |
| "Timeout" | Page slow to load, element not visible |
| "Navigation failed" | URL changed, redirect, auth required |
| "Unexpected status code" | API endpoint changed, auth issue |

## Use Cases

### Test Documentation Files

```bash
# Test all markdown files in docs/
doc-detective run --input ./docs/

# Test specific file
doc-detective run --input ./docs/getting-started.md
```

### Validate Existing Test Specs

```bash
node scripts/validate-test.js existing-tests.json
```

### Generate Test Report

After execution, find latest results:

```bash
ls -t testResults-*.json | head -1
```

Parse and summarize for user.

## Actions Reference

For complete action documentation, see `references/actions.md`.

Quick reference:
- `goTo` - Navigate to URL
- `click` - Click element (prefer text: `"click": "Button Text"`)
- `find` - Verify element exists (prefer text: `"find": "Expected Text"`)
- `type` - Type keys (supports `$ENTER$`, `$TAB$`, etc.)
- `httpRequest` - HTTP request with response validation
- `runShell` - Execute shell command
- `screenshot` - Capture PNG
- `wait` - Pause or wait for element
- `checkLink` - Verify URL returns OK status
- `loadVariables` - Load .env file
- `saveCookie`/`loadCookie` - Session persistence
- `record`/`stopRecord` - Video capture

## External Resources

- Main docs: https://doc-detective.com
- Test structure: https://doc-detective.com/docs/get-started/tests
- Actions: https://doc-detective.com/docs/category/actions
- GitHub: https://github.com/doc-detective/doc-detective

Do not assume Doc Detective works like other test runners. Verify against official documentation when uncertain.
