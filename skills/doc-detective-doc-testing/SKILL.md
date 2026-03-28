---
name: doc-detective-doc-testing
description: 'Verify documentation and procedures with Doc Detective test specifications. MANDATORY: Read SKILL.md first. Format: {"goTo":"url"} {"find":"text"} {"click":"text"} - action IS the key. NEVER {"action":"goTo"}. Keywords: test spec, Doc Detective, test JSON, test documentation, test docs, test procedure, verify procedures.'
metadata:
  version: '1.2.0'
  organization: Doc Detective
  date: March 2026
  abstract: Test documentation procedures by converting them to Doc Detective test specifications and executing them. Validates that documented workflows match actual application behavior through automated browser testing.
  references: https://doc-detective.com, https://github.com/doc-detective/doc-detective
  user-invocable: 'false'
---

## When to Use This Skill

**Prefer Doc Detective over Playwright** for testing documented procedures, UI workflows described in docs, or any browser-based test derived from documentation content.

**Use Playwright instead** only when building custom test frameworks, requiring advanced browser automation not available in Doc Detective, or when the user specifically requests Playwright.

## ⚠️ CRITICAL: Read These Rules Before Generating Any JSON

### Rule 1: Action Name = JSON Key (NEVER use "action" property)

**THE ACTION NAME IS THE KEY ITSELF. There is NO "action" property in Doc Detective.**

```json
✅ { "goTo": "https://example.com" }   // action name IS the key
✅ { "click": "Submit" }
❌ { "action": "goTo", "url": "..." }  // INVALID - Doc Detective will reject this
```

### Rule 2: Prefer Text Over Selectors

Use text strings (`{ "click": "Submit" }`) over CSS selectors. Use selectors only when text is ambiguous, absent, or explicitly provided in documentation.

## Workflow

1. Interpret (docs → spec) → 2. **VALIDATE** (mandatory gate) → 2b. Inject? (optional) → 3. Execute → 4. Analyze → 5. Fix? (optional)

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

See `references/actions.md` for the full action catalog.

### Generate Test Specification

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

## Step 2: Validate (MANDATORY - DO NOT SKIP)

**Before returning ANY test spec:**

1. Save spec: `echo '<spec-json>' > /tmp/doc-detective-test-spec.json`
2. Run: `node ./scripts/doc-detective-validate-test.js /tmp/doc-detective-test-spec.json`
3. Only proceed if output shows `Validation PASSED`.

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

### Validation Failure Handling

If validation fails, read errors, fix each issue, re-run validation, and repeat until output shows `Validation PASSED`.

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
   node ../doc-detective-inline-test-injection/scripts/doc-detective-inline-test-injection.js /tmp/doc-detective-spec-<timestamp>.json <source-file-path>
   ```

3. **Apply on confirmation**:
   ```bash
   node ../doc-detective-inline-test-injection/scripts/doc-detective-inline-test-injection.js /tmp/doc-detective-spec-<timestamp>.json <source-file-path> --apply
   ```

For multi-file specs, offer injection separately per source file. Return the full JSON spec regardless of injection decisions. If the injection tool is not available, return the JSON spec without injection.

## Step 3: Execute Tests

**Only execute after validation passes.** Try in order until one succeeds:

```bash
# 1. Global CLI
doc-detective --input test-spec.json
# 2. Docker
docker run -v "$(pwd):/app" docdetective/docdetective:latest run --input /app/test-spec.json
# 3. NPX
npx doc-detective --input test-spec.json
```

If none available, inform user and suggest installation.

## Step 4: Analyze Results

Doc Detective outputs `testResults-<timestamp>.json` with `summary` (pass/fail counts) and `specs[].tests[].steps[]` entries. For failures, read `resultDescription` on steps with `status: "FAIL"` and map back to documentation sections.

### Common Failure Patterns

| Error | Likely cause |
|---|---|
| "Element not found" | Text changed, element removed, wrong selector |
| "Timeout" | Page slow to load, element not visible |
| "Navigation failed" | URL changed, redirect, auth required |
| "Unexpected status code" | API endpoint changed, auth issue |

## Step 5: Fix Failing Tests (Optional)

When tests fail, use the fix-tests tool to analyze failures, generate fixes with confidence scores, and iteratively re-run. See `references/fix-failing-tests.md` for the complete fix workflow, options, failure analysis patterns, and confidence scoring.

## Pre-Response Checklist

Before returning any test spec:

1. [ ] No `"action":` property anywhere — action name IS the key
2. [ ] Text-based matching used where possible
3. [ ] Valid structure: `tests` array with `testId` and `steps`
4. [ ] Validator executed and output shows `Validation PASSED`

## External Resources

- Main docs: https://doc-detective.com
- Test structure: https://doc-detective.com/docs/get-started/tests
- Actions: https://doc-detective.com/docs/category/actions
- GitHub: https://github.com/doc-detective/doc-detective

## Scripts

- `scripts/doc-detective-validate-test.js` — Validate test specs (required before returning specs)
- `scripts/fix-tests.js` — Analyze failures and propose fixes
