---
description: Turn documented procedures into a Doc Detective test spec (JSON) without running it. The source can be a doc file or doc text pasted into the message. Use when the user wants a spec written, added to, or updated, or asks to see or sketch the test for specific docs, or which actions specific doc steps translate to, even if the answer could be written out directly. To run tests or check that docs still work, use doc-detective-test. To put tests inside the doc source as comments, use doc-detective-inject.
skill: doc-detective-generate
---

# Generate Tests Command

**Skill:** `doc-detective:doc-detective-generate`

## Goal

Produce a valid Doc Detective test specification that tests what a documentation file tells its readers to do. Each distinct procedure in the file becomes its own test, and each test step matches an instruction the reader would follow. The user, `/doc-detective-test`, or `/doc-detective-init` then runs the spec, so it must pass validation as written. A spec that fails validation stops whoever runs it.

For documentation and web UI testing, use Doc Detective rather than Playwright.

## Usage

```bash
/doc-detective-generate <file-path> [--output <path>] [--merge <existing-spec>]
```

- `--output <path>`: Write the spec to a file instead of stdout.
- `--merge <existing-spec>`: Add new tests to an existing spec.

```bash
/doc-detective-generate docs/getting-started.md
/doc-detective-generate docs/login.md --output tests/login-spec.json
/doc-detective-generate docs/new-feature.md --merge tests/existing-spec.json
```

## Guardrails

- **Don't run the spec.** Output it, and leave running it to `/doc-detective-test`. The caller decides when and where tests run.
- **Output only a spec that passed validation.** Validation passes when `npx doc-detective@5 validate` exits `0`, or a fallback validator below confirms the spec. An invalid spec fails for every caller, so when you can't fix an error, report it and output nothing.
- **Make the action name the step's key.** Write `{ "goTo": "https://example.com" }`. Doc Detective has no `"action"` property, and it rejects a step such as `{ "action": "goTo" }`.
- **Don't guess the inputs.** The source is a doc file, or doc text the user pasted into the message. Ask the user for it when there's neither. Also ask when the file can't be read or the source has no step-by-step content. Also ask when the `--output` directory doesn't exist, or when the `--merge` spec is missing or isn't valid JSON. A spec built from a guessed source tests the wrong document.
- **When you merge, keep each `testId` unique.** Skip a new test whose `testId` matches an existing test, unless the user asked to update that test. Then update it in place. A duplicate ID makes results ambiguous.

## Build the spec

### Get a test plan

When the source is a file, start from Doc Detective's own plan for it:

```bash
npx doc-detective@5 --dry-run --input <doc-file>
```

It runs nothing. It prints the resolved test plan as JSON. The plan holds the inline tests already in the doc. Because `detectSteps` defaults to `true`, it also holds steps detected from the doc's markup. The plan is shaped `{ "resolvedTestsId", "config", "specs": [{ "tests": [{ "testId", "contexts": [{ "steps": [...] }] }] }] }`. Turn it into the spec `{ "tests": [...] }`:

- Take each plan test's steps from its `contexts[0].steps`, and drop each step's `location`. Detection doesn't split a doc by procedure: detected steps outside inline tests run together in one test. Split them into one test per procedure. Give each test a `testId` that names its procedure.
- Check each detected step against the doc. Detection reads markup, not intent: a bold term can become both a `click` and a `find`, and a link both a `goTo` and a `checkLink`. Keep the step the reader does, and add steps for instructions that detection missed.

When it prints `No tests found, so there's no test plan to print.` and exits `2`, the doc has nothing to detect, so build every test by hand, as below. For pasted text, or when `npx` isn't available, call `detect_tests` if it's registered (see `_shared/MCP-USAGE.md`), and otherwise build every test by hand.

To build tests by hand, read the source file, or use the pasted doc text, and find each procedure. Procedures appear as numbered lists, sequential bullet lists, and prose with action verbs (navigate, click, enter, verify). They also appear as command code blocks and API descriptions. Create one test for each procedure.

### Map instructions to actions

| Documentation describes | Action | Example |
|---|---|---|
| Navigate/go to URL | `goTo` | `{ "goTo": "https://example.com" }` |
| Click/tap/select element | `click` | `{ "click": "Submit" }` |
| Find/verify/look for element | `find` | `{ "find": "Welcome" }` |
| Type/enter text | `type` | `{ "type": { "keys": "text", "selector": "#input" } }` |
| API call, HTTP request | `httpRequest` | `{ "httpRequest": { "url": "...", "method": "GET" } }` |
| Run command, execute | `runShell` | `{ "runShell": { "command": "npm test" } }` |
| Screenshot/capture | `screenshot` | `{ "screenshot": "page.png" }` |
| Wait/pause/delay | `wait` | `{ "wait": 2000 }` |
| Check link/verify URL | `checkLink` | `{ "checkLink": "https://example.com" }` |
| Load environment vars | `loadVariables` | `{ "loadVariables": ".env" }` |

Match elements by their visible text, as a reader does: write `{ "click": "Submit" }`, not `{ "click": { "selector": "button.submit" } }`. Text matching keeps working when the markup changes. Use a selector only when the docs give one, several elements share the same text, or the element has no visible text.

Full action catalog, with every field: [references/actions.md](references/actions.md). Other skills and the specialist agent use it too.

### Validate

Validate with Doc Detective's own CLI. It checks the spec without running it:

```bash
npx doc-detective@5 validate <spec-file>
# Or, for a spec that isn't in a file yet:
echo '<generated-spec>' | npx doc-detective@5 validate -
```

Exit `0` means the spec is valid. Exit `1` means it isn't. Stdout names each invalid field, such as ``tests[0].steps[0]: unknown action `action`.`` Exit `2` means the CLI found no tests or couldn't load a config. Read stderr. A `.doc-detective.json`, `.yaml`, or `.yml` in the current directory loads on every run. An invalid one fails with `Invalid config in <file>` before your spec is checked.

When `npx` isn't available, run the bundled validator. It passes when it prints `Validation PASSED`:

```bash
echo '<generated-spec>' | node skills/doc-detective-test/scripts/doc-detective-validate-test.js --stdin
```

When a `validate_spec` tool is registered, you can call it instead of the bundled validator. See `_shared/MCP-USAGE.md`.

Fix the step each error names, then validate again. Each step needs exactly one action key, and the spec needs a top-level `tests` array.

### Output

- **No flags:** Print the JSON spec to stdout.
- **`--output <path>`:** Write the spec to that path.
- **`--merge <file>`:** Load the existing spec, and add each new test whose `testId` isn't already there. When the user asked to update the spec because the docs changed, update each existing test whose `testId` matches. Start from its current steps, change the ones the docs changed, and keep the rest. Validate the merged spec, then output it.

## Example

The docs tell the reader to navigate to the login URL, enter an email address, click **Sign In**, and verify that the dashboard appears.

Generated spec:

```json
{
  "tests": [{
    "testId": "login-guide", "description": "Login Guide",
    "steps": [
      { "stepId": "nav", "goTo": "https://app.example.com/login" },
      { "stepId": "email", "type": { "keys": "$EMAIL", "selector": "[type='email']" } },
      { "stepId": "signin", "click": "Sign In" },
      { "stepId": "verify", "find": "Dashboard" }
    ]
  }]
}
```

`$EMAIL` reads the `EMAIL` environment variable. Set it in the environment, or load it from a `.env` file with `loadVariables`. `$NAME$`, with a trailing `$`, is a special key such as `$ENTER$`, not a variable.

## Done when

- The spec has no `"action":` property.
- Steps match on text, except where the selector rule above calls for a selector.
- `npx doc-detective@5 validate` exited `0`, or a fallback validator confirmed the spec.
- With `--merge`, no two tests share a `testId`.

## Related commands

- `/doc-detective-validate`: Validate an existing spec again.
- `/doc-detective-test`: Run the spec.
