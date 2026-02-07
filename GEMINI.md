# Doc Detective Agent Tools

You have access to Doc Detective documentation testing tools. Use these to test documentation procedures, validate that documented workflows match actual application behavior, and inject tests into documentation files.

## Core Concept: Docs as Tests

Documentation contains testable assertions — promises to users about what happens when they follow instructions. Each assertion has an **action** (what the user does), **context** (system state), and **expected outcome** (what should happen). Doc Detective automates validation of these assertions.

## Available Commands

- `/doc-detective:init` — Bootstrap Doc Detective in a repository (detect docs, generate config, create tests, run and fix)
- `/doc-detective:generate <file>` — Convert documentation procedures into test specifications without executing
- `/doc-detective:test <file>` — Generate tests from docs, validate, execute, and report results
- `/doc-detective:inject <spec> <source>` — Inject test specs into documentation as inline comments
- `/doc-detective:validate <spec>` — Validate test specification structure

## Available Scripts

These scripts are available in the extension directory for validating, fixing, and injecting tests:

- **Validate test spec:** `node skills/doc-testing/scripts/dist/validate-test.js <spec-file>`
- **Validate from stdin:** `echo '<json>' | node skills/doc-testing/scripts/dist/validate-test.js --stdin`
- **Fix failing tests:** `node skills/doc-testing/scripts/dist/fix-tests.js <results-file> --spec <spec-file> [--threshold 80] [--auto-fix] [--dry-run]`
- **Inject inline tests (preview):** `node skills/inline-test-injection/scripts/dist/inline-test-injection.js <spec-file> <source-file>`
- **Inject inline tests (apply):** `node skills/inline-test-injection/scripts/dist/inline-test-injection.js <spec-file> <source-file> --apply`

## Doc Detective Action Reference

Each action name IS the JSON key. Never use an `"action"` property.

| Action | Format | Purpose |
|--------|--------|---------|
| `goTo` | `{ "goTo": "https://..." }` | Navigate to URL |
| `click` | `{ "click": "Button Text" }` | Click element (prefer text over selectors) |
| `find` | `{ "find": "Expected Text" }` | Verify element exists |
| `type` | `{ "type": { "keys": "text", "selector": "#id" } }` | Type into field |
| `httpRequest` | `{ "httpRequest": { "url": "...", "method": "GET" } }` | HTTP request |
| `runShell` | `{ "runShell": { "command": "..." } }` | Execute shell command |
| `screenshot` | `{ "screenshot": "name.png" }` | Capture screenshot |
| `wait` | `{ "wait": 1000 }` | Pause or wait for element |
| `checkLink` | `{ "checkLink": "https://..." }` | Verify URL returns OK |
| `loadVariables` | `{ "loadVariables": ".env" }` | Load environment variables |

## Test Specification Format

```json
{
  "tests": [
    {
      "testId": "procedure-name",
      "description": "What this test validates",
      "steps": [
        { "goTo": "https://example.com" },
        { "find": "Welcome" },
        { "click": "Sign In" }
      ]
    }
  ]
}
```

## Key Rules

1. **Action name IS the key** — Use `{ "goTo": "url" }`, never `{ "action": "goTo", "url": "..." }`
2. **Prefer text over selectors** — Use `{ "click": "Submit" }` not `{ "click": "#submit-btn" }`
3. **Always validate specs** — Run the validate-test script before returning any test specification
4. **Execution fallback chain** — Try `doc-detective run`, then `docker run docdetective/doc-detective`, then `npx doc-detective`

## Detailed References

For complete documentation, read these files:
- Actions reference: `skills/doc-testing/references/actions.md`
- Configuration guidance: `skills/project-bootstrap/references/config-guidance.md`
- Procedure heuristics: `skills/project-bootstrap/references/procedure-heuristics.md`
- Markup patterns: `skills/inline-test-injection/references/markup-patterns.md`
- Doc Detective docs: https://doc-detective.com
