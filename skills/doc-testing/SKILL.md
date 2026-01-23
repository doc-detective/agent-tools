---
name: doc-testing
description: 'Test documentation procedures using Doc Detective (doc-detective.com). Use when (1) creating Doc Detective test specs, (2) testing procedures in documentation, (3) converting docs to test specifications, (4) validating Doc Detective test specs, or (5) running Doc Detective tests. Triggers on phrases like "test documentation", "verify procedures", "Doc Detective", "test spec", "doc test", "test the docs", or "create tests from docs". FORMAT: action name IS the key ({"goTo": "url"} not {"action": "goTo"}). ALWAYS validate with ./scripts/dist/validate-test before returning specs. Prefer text over selectors ({"click": "Submit"} not {"click": "#btn"}).'
---

# Doc Testing

Test documentation procedures by converting them to Doc Detective test specifications and executing them.

## ⚠️ STOP: Read These Rules Before Generating Any JSON

### Rule 1: Action Name = JSON Key

```json
✅ { "goTo": "https://example.com" }
✅ { "find": "Welcome" }  
✅ { "click": "Submit" }
✅ { "type": { "keys": "hello", "selector": "#input" } }

❌ { "action": "goTo", "url": "..." }     // WRONG - no "action" key!
❌ { "action": "find", "text": "..." }    // WRONG - no "action" key!
```

### Rule 2: Prefer Text Over Selectors

```json
✅ { "click": "Submit" }           // Text-based - matches visible text
✅ { "find": "Welcome" }           // Text-based - matches visible text

❌ { "click": "#submit-btn" }      // Selector - only if text won't work
❌ { "find": ".welcome-msg" }      // Selector - only if text won't work
```

### Rule 3: ALWAYS Validate Before Returning

```bash
./scripts/dist/validate-test spec.json    # Must show "Validation PASSED"
```

## Workflow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐     ┌─────────────┐
│ 1. Interpret    │────▶│ 2. VALIDATE      │────▶│ 3. Execute  │────▶│ 4. Analyze  │
│ (docs → spec)   │     │ (MANDATORY GATE) │     │ (run tests) │     │ (results)   │
└─────────────────┘     └──────────────────┘     └─────────────┘     └─────────────┘
```

## Step 1: Text-to-Test Interpretation

Convert documentation procedures into test specifications.

### Map Actions to Steps

| Documentation describes | Doc Detective step format |
|---|---|
| Navigate to URL | `{ "goTo": "https://..." }` |
| Click/tap element | `{ "click": "Button Text" }` |
| Find/verify element | `{ "find": "Expected Text" }` |
| Type text | `{ "type": { "keys": "text", "selector": "#id" } }` |
| API call | `{ "httpRequest": { "url": "...", "method": "GET" } }` |
| Screenshot | `{ "screenshot": "name.png" }` |
| Shell command | `{ "runShell": { "command": "..." } }` |
| Wait/pause | `{ "wait": 1000 }` |
| Check link | `{ "checkLink": "https://..." }` |

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

## Step 2: Validate (MANDATORY)

**Always run validation before returning specs or executing tests.**

### Validation Command

```bash
# Validate a file
./scripts/dist/validate-test test-spec.json

# Validate from stdin
cat test-spec.json | ./scripts/dist/validate-test --stdin
```

### What Validation Checks

- Required `tests` array exists and is non-empty
- Each test has `steps` array that is non-empty  
- Each step has exactly one known action
- Action parameters match expected types

### Known Actions

These are the only valid action types:
- `goTo` - URL string or `{ url: string, waitUntil?: string }`
- `click` - Text string or `{ selector: string }`
- `find` - Text string or `{ selector: string, timeout?: number, matchText?: string }`
- `type` - `{ keys: string, selector: string }`
- `wait` - Number (ms) or `{ selector: string, state: string }`
- `screenshot` - Path string or `{ path: string }`
- `httpRequest` - `{ url: string, method: string, ... }`
- `runShell` - `{ command: string, exitCodes?: number[] }`
- `checkLink` - URL string or `{ url: string, statusCodes?: number[] }`
- `loadVariables` - File path string
- `loadCookie` / `saveCookie` - File path string
- `record` - Path string or object
- `stopRecord` - Boolean true

### Example Validation Output

**Passing:**
```
✓ Validation PASSED
  Mode: structural validation
  Tests validated: 1
  Steps validated: 6
  Steps passed: 6
  Steps failed: 0
```

**Failing:**
```
✗ Validation FAILED
  Mode: structural validation
  Tests validated: 1
  Steps validated: 3
  Steps passed: 2
  Steps failed: 1

Errors:

  1. Unknown action: "navigate". Known actions: checkLink, click, ...
     Test: my-test
     Step: step-1
     Action: navigate
```

### Validation Failure Handling

If validation fails:
1. Read the error messages
2. Fix each reported issue in the test spec
3. Re-run validation
4. Repeat until validation passes
5. Only then proceed to return spec or execute

## Step 3: Execute Tests

**Only execute after validation passes.**

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

## Step 4: Analyze Results

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

## Checklist: Before Completing Any Task

Before responding to the user with a test specification:

- [ ] Action names are JSON keys (e.g., `"goTo": "url"` NOT `"action": "goTo"`)
- [ ] Using text-based matching where possible (`"click": "Submit"` not `"click": "#btn"`)
- [ ] Generated valid JSON test spec with `tests` array
- [ ] Each test has `testId` and `steps` array
- [ ] **RAN `./scripts/dist/validate-test` and it showed "Validation PASSED"**
- [ ] (If executing) Ran Doc Detective and captured results

## Actions Reference

For complete action documentation, see `references/actions.md`.

Quick reference - each action name IS the JSON key:
- `{ "goTo": "https://..." }` - Navigate to URL
- `{ "click": "Button Text" }` - Click element (prefer text)
- `{ "find": "Expected Text" }` - Verify element exists (prefer text)
- `{ "type": { "keys": "...", "selector": "#..." } }` - Type keys
- `{ "httpRequest": { "url": "...", "method": "GET" } }` - HTTP request
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
