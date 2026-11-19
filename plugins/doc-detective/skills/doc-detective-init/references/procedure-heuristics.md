# Procedure Identification Heuristics

Guidelines and prompts for identifying testable procedures in documentation. Use these patterns to analyze docs and determine what can be converted to Doc Detective tests.

## What Makes a Testable Procedure?

A testable procedure has:

1. **Sequential steps** - Ordered actions that build on each other
2. **Observable actions** - Things that can be automated (click, navigate, verify)
3. **Defined outcomes** - Expected results that can be verified
4. **Reproducible context** - Clear starting point and requirements

## Structural Indicators

### High-Confidence Patterns

These patterns strongly indicate testable procedures:

| Pattern | Example | Confidence |
|---------|---------|------------|
| Numbered lists | `1. Click... 2. Enter... 3. Verify...` | 90% |
| Heading with "How to" | `## How to Configure SSO` | 85% |
| Heading with "Getting Started" | `# Getting Started` | 80% |
| Task-oriented heading | `## Create a New Project` | 80% |
| Heading with action verb | `## Install the Package` | 75% |

### Medium-Confidence Patterns

| Pattern | Example | Confidence |
|---------|---------|------------|
| Bullet lists with actions | `- Click Settings` | 60% |
| Sequential prose | `First, navigate to... Then, click...` | 55% |
| Code blocks with commands | ` ```bash npm install``` ` | 50% |

### Low-Confidence Patterns

| Pattern | Example | Confidence |
|---------|---------|------------|
| Conceptual explanations | `OAuth works by...` | 20% |
| Reference tables | `| Option | Description |` | 15% |
| FAQs | `Q: How does it work?` | 10% |

## Action Verb Detection

### Navigation Verbs → `goTo` action

```
navigate (to), go to, open, visit, access, browse to, proceed to, launch
```

Examples:
- "Navigate to the **Settings** page" → `{ "goTo": "..." }` or `{ "click": "Settings" }`
- "Open https://example.com" → `{ "goTo": "https://example.com" }`

### Click Verbs → `click` action

```
click, tap, select, press, choose, check (checkbox), toggle
```

Examples:
- "Click **Submit**" → `{ "click": "Submit" }`
- "Select the **Advanced** option" → `{ "click": "Advanced" }`

### Input Verbs → `type` action

```
type, enter, input, fill in, provide, specify, write
```

Examples:
- "Enter your email address" → `{ "type": { "keys": "...", "selector": "..." } }`
- "Type 'hello world' in the search box" → `{ "type": { "keys": "hello world", "selector": "..." } }`

### Verification Verbs → `find` action

```
verify, check (that), confirm, ensure, see, should see, look for, expect, appears
```

Examples:
- "Verify the **Dashboard** appears" → `{ "find": "Dashboard" }`
- "You should see a success message" → `{ "find": "..." }`

### Execution Verbs → `runShell` action

```
run, execute, run command, type in terminal, enter in terminal
```

Examples:
- "Run `npm install`" → `{ "runShell": { "command": "npm install" } }`

## CLI / command-line documentation

Many docs are not UI flows — they show shell commands and their expected output. These map cleanly to `runShell`, and are often the *majority* of testable content for a CLI/SDK project. Patterns:

- **Assert the exit-code contract.** A documented command that should succeed → `exitCodes: [0]`; a documented *failure* (e.g. "this errors with…") → the exit code the doc promises (e.g. `[1]` or `[2]`). This catches behavior changes the prose claims.
- **Assert output with `stdio`.** Match a stable substring or a `/regex/` of the documented output (e.g. a summary line, an error message). Avoid asserting volatile output (timestamps, absolute paths).
- **Test the local build, not a published package.** If the docs show `mytool …` (or `npx mytool …`) but the tool is built from this same repo, run against the local build so the test verifies *this* branch, not whatever is on the registry. Build first, then expose the command — e.g. `npm run build` then `npm link` (so both `mytool` and `npx mytool` resolve locally), and run the doc-detective step after. An unpublished package makes this safe: `npx mytool` can only resolve the link or fail loudly, never fetch a stranger.
- **Use committed fixtures.** Replace placeholder paths in the docs (`path/to/your-file`) with real fixtures checked into the repo so the command is reproducible in CI.
- **`workingDirectory`** scopes a command to a fixture dir without `cd`.

For CLI docs, a command block with a documented outcome (exit code or output) is a testable procedure even without URLs or UI elements.

## Mapping to Doc Detective Actions

### From Documentation Elements

| Documentation Element | Doc Detective Action |
|-----------------------|---------------------|
| `[Link](url)` after "Go to" | `{ "goTo": "url" }` |
| `**Bold text**` after click verb | `{ "click": "Bold text" }` |
| `**Bold text**` standalone | `{ "find": "Bold text" }` |
| `"quoted text"` after type verb | `{ "type": { "keys": "quoted text", "selector": "..." } }` |
| Code block with shell command | `{ "runShell": { "command": "..." } }` |
| Image with `.screenshot` class | `{ "screenshot": "path.png" }` |
| Hyperlink | `{ "checkLink": "url" }` |

### Special Cases

**Environment variables:**
When docs mention "enter your API key" or similar:
```json
{ "type": { "keys": "$API_KEY$", "selector": "..." } }
```

**Wait conditions:**
When docs say "wait for" or "until" an element appears, find it with a `timeout`. For a loading indicator that disappears, find the element that appears when loading finishes:
```json
{ "find": { "selector": ".results", "timeout": 10000 } }
```

**Form submissions:**
When docs describe submitting forms:
```json
{ "type": { "keys": "$ENTER$", "selector": "..." } }
// or
{ "click": "Submit" }
```

## Related Resources

- Doc Detective actions: ../../doc-detective-generate/references/actions.md
- Test structure: https://docs.doc-detective.com/docs/get-started/how-testing-works
- Detected tests: https://docs.doc-detective.com/docs/test-docs/detected
