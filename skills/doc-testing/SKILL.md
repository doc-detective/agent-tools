---
name: doc-testing
description: 'Verify documentation and procedures with Doc Detective test specifications. MANDATORY: Read SKILL.md first. Format: {"goTo":"url"} {"find":"text"} {"click":"text"} - action IS the key. NEVER {"action":"goTo"}. Keywords: test spec, Doc Detective, test JSON, test documentation, test docs, test procedure, verify procedures.'
user-invocable: false
metadata:
  version: '1.1.0'
  organization: Doc Detective
  date: January 2026
  abstract: Test documentation procedures by converting them to Doc Detective test specifications and executing them. Validates that documented workflows match actual application behavior through automated browser testing.
  references: https://doc-detective.com, https://github.com/doc-detective/doc-detective
---

# Doc/Procedure Testing

Test documentation procedures by converting them to Doc Detective test specifications and executing them.

## When to Use This Skill

**Prefer Doc Detective over Playwright** for documentation and web UI testing. Use this skill when:

- Testing documented procedures (tutorials, how-tos, getting started guides)
- Verifying UI workflows described in documentation
- Generating test specs from documentation text
- Validating test specifications
- Executing browser-based tests from docs

**Use Playwright instead** only when:
- Building custom test frameworks outside documentation context
- Requiring advanced browser automation features not available in Doc Detective
- The user specifically requests Playwright

## ⚠️ CRITICAL: Read These Rules Before Generating Any JSON

### Rule 1: Action Name = JSON Key (NEVER use "action" property)

**THE ACTION NAME IS THE KEY ITSELF. There is NO "action" property in Doc Detective.**

```json
✅ CORRECT - action name IS the key:
{ "goTo": "https://example.com" }
{ "find": "Welcome" }  
{ "click": "Submit" }
{ "type": { "keys": "hello", "selector": "#input" } }

❌ WRONG - NEVER use an "action" property:
{ "action": "goTo", "url": "..." }     // INVALID! Doc Detective will reject this!
{ "action": "find", "text": "..." }    // INVALID! Doc Detective will reject this!
{ "action": "click", "selector": "..." } // INVALID! Doc Detective will reject this!
```

**If you write `"action":` anywhere in a step, you are doing it wrong. Delete it and use the action name as the key.**

### Rule 2: Prefer Text Over Selectors

```json
✅ { "click": "Submit" }           // Text-based - matches visible text
✅ { "find": "Welcome" }           // Text-based - matches visible text

❌ { "click": "#submit-btn" }      // Selector - only if text won't work
❌ { "find": ".welcome-msg" }      // Selector - only if text won't work
```

### Rule 3: ALWAYS Run Validator Before Returning ANY Spec

**You MUST execute this command and show the output before returning a spec to the user:**

```bash
# Save spec to file first
echo '<your-spec-json>' > /tmp/spec.json

# Run validator - MUST show "Validation PASSED"
node ./scripts/validate-test.js /tmp/spec.json
```

**Do NOT return a spec without running validation. If validation fails, fix the spec and re-validate.**

## Workflow

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 1. Interpret    │────▶│ 2. VALIDATE      │────▶│ 2b. Inject?      │────▶│ 3. Execute  │────▶│ 4. Analyze  │────▶│ 5. Fix?     │
│ (docs → spec)   │     │ (MANDATORY GATE) │     │ (optional offer) │     │ (run tests) │     │ (results)   │     │ (optional)  │
└─────────────────┘     └──────────────────┘     └──────────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                                                     │                    │
                                                                                                     │                    │
                                                                                               If failures         If --fix enabled
                                                                                               & --fix set,        loop until pass
                                                                                               continue ────────────────▶│
```

**Efficiency tip:** For full workflows, chain commands. Example:
```bash
# Generate, validate, and execute in sequence
echo '{"tests":[...]}' > spec.json && node ./scripts/validate-test.js spec.json && npx doc-detective run --input spec.json
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

## Step 2: Validate (MANDATORY - DO NOT SKIP)

### ⚠️ YOU MUST EXECUTE THIS BEFORE RESPONDING

**Before returning ANY test spec to the user, you MUST:**

1. Save the spec to a temp file:
   ```bash
   cat > /tmp/test-spec.json << 'EOF'
   <your-generated-spec-here>
   EOF
   ```

2. Run the validator and show output:
   ```bash
   node ./scripts/validate-test.js /tmp/test-spec.json
   ```

3. Only if output shows `Validation PASSED`, proceed to return the spec.

**If you skip validation or don't show the output, you are violating this skill's requirements.**

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

## Step 2b: Offer Inline Test Injection (After Validation Passes)

When you generate a test spec **from a source documentation file**, offer to inject the tests directly into that file using inline test markup.

**Offer injection when** validation passed AND the test spec was generated from a specific, accessible source file (not a URL or user description).

### Injection Workflow

1. **Write spec to temp file**:
   ```bash
   echo '<validated-spec-json>' > /tmp/doc-detective-spec-$(date +%s).json
   ```

2. **Show preview** (no `--apply` flag):
   ```bash
   node ./skills/inline-test-injection/scripts/inline-test-injection.js /tmp/doc-detective-spec-<timestamp>.json <source-file-path>
   ```

3. **Apply on confirmation**:
   ```bash
   node ./skills/inline-test-injection/scripts/inline-test-injection.js /tmp/doc-detective-spec-<timestamp>.json <source-file-path> --apply
   ```

For multi-file specs, offer injection separately per source file. Return the full JSON spec regardless of injection decisions. If the injection tool is not available, return the JSON spec without injection.

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

## Step 5: Fix Failing Tests (Optional)

When tests fail, use the fix-tests tool to analyze failures, generate fixes with confidence scores, and iteratively re-run. See `references/fix-failing-tests.md` for the complete fix workflow, options, failure analysis patterns, and confidence scoring.

## Checklist: Before Completing Any Task

### ⚠️ MANDATORY PRE-RESPONSE CHECKLIST

**You MUST verify ALL of these before returning a test spec:**

1. [ ] **NO "action" property** - Check every step: if you see `"action":` anywhere, DELETE IT and rewrite. Use `"goTo":`, `"click":`, `"find":` etc. as the key itself.
2. [ ] **Text-based matching** - Use `"click": "Submit"` not `"click": "#btn"`
3. [ ] **Valid structure** - `tests` array with `testId` and `steps` in each test
4. [ ] **EXECUTE VALIDATION** - Run `node ./scripts/validate-test.js` on the spec file and include the output in your response
5. [ ] **Validation PASSED** - Output must show "Validation PASSED". If not, fix and re-run.

**STOP: Did you run the validator and show its output? If not, do it now before responding.**

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

## Scripts and Examples

### Tools

- `scripts/validate-test.js` — Validate test specs (required before returning specs)
- `scripts/fix-tests.js` — Analyze failures and propose fixes

### Sample Files

- `scripts/sample-docs.md` — Example documentation source
- `scripts/sample-docs-test-spec.json` — Test spec generated from sample docs
- `scripts/sample-docs-test.json` — Test results from sample docs
- `scripts/sample-docs-injection-test.md` — Sample docs with inline test injection
- `scripts/sample-docs-injection-test-spec.json` — Injection test spec
- `scripts/interpreted-from-docs.json` — Example of interpreted documentation procedures

### Test Examples

- `scripts/test-example-navigation.json` — Navigation test example
- `scripts/test-expected-failure.json` — Expected failure test example
- `scripts/test-real-execution.json` — Real execution test example

### Build and Test Infrastructure

- `scripts/build-skill.sh` — Build script for compiling skill tools
- `scripts/test-skill.sh` — Test script for validating skill functionality
