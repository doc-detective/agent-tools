---
name: doc-detective-generate
description: 'Turn the procedures in a documentation file into a Doc Detective test spec (JSON) without running it. Use when the user wants a spec written or added to, not executed. To run tests or check that docs still work, use doc-detective-test. To put tests inside the doc source as comments, use doc-detective-inject.'
metadata:
  version: '2.1.4'
  organization: Doc Detective
  date: November 2026
  abstract: Interpret documentation procedures into Doc Detective test specifications without executing the tests. Parses docs, maps language to actions, validates the spec, and outputs the result.
  references: https://docs.doc-detective.com, https://github.com/doc-detective/doc-detective
  user-invocable: 'true'
user-invocable: true
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
- **Output only a spec that passed validation.** Validation passes when `validate_spec` returns `valid: true` or the validator prints `Validation PASSED`. An invalid spec fails for every caller, so when you can't fix an error, report it and output nothing.
- **Make the action name the step's key.** Write `{ "goTo": "https://example.com" }`. Doc Detective has no `"action"` property, and it rejects a step such as `{ "action": "goTo" }`.
- **Don't guess the inputs.** When the source file is missing or can't be read, or it has no step-by-step content, ask the user for it. Also ask when the `--output` directory doesn't exist, or when the `--merge` spec is missing or isn't valid JSON. A spec built from a guessed source tests the wrong document.
- **When you merge, keep each `testId` unique.** Skip a new test whose `testId` matches an existing test. A duplicate ID makes results ambiguous.

## Build the spec

### Get a test plan

When a tool named `detect_tests` (or `mcp__doc-detective__detect_tests`) is registered, call it first. It returns a test plan that already conforms to `doc-detective-common` semantics, so it's more reliable than manual interpretation:

```javascript
detect_tests({
  content: <raw-doc-content>,
  filePath: <source-path>,            // optional, used only for file-type inference
  fileType: "markdown" | "asciidoc" | "dita" | "html" | "rst"  // optional override
})
```

The tool returns `{tests[], detectedFileType, warnings[]}`. Build the spec as `{ "tests": <returned-tests-array> }`. When the user wants tests beyond the returned plan, add them by manual interpretation. See `_shared/MCP-USAGE.md` for tool names on each host.

Without the tool, read the source file and find each procedure. Procedures appear as numbered lists, sequential bullet lists, and prose with action verbs (navigate, click, enter, verify). They also appear as command code blocks and API descriptions. Create one test for each procedure.

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

Call `validate_spec({object: <generated-spec>, schemaKey: "spec_v3", addDefaults: true})` when the tool is registered. `<generated-spec>` is an object shaped `{ "tests": [...] }`. Without the tool, run the bundled validator:

```bash
echo '<generated-spec>' | node skills/doc-detective-test/scripts/doc-detective-validate-test.js --stdin
```

The bundled script can lag the installed Doc Detective engine. When it passes, also run `npx doc-detective@5 validate <spec-file>` if `npx` is available: exit `0` confirms the spec, and exit `1` names each invalid field.

Fix the step each error names, then validate again. Each step needs exactly one action key, and the spec needs a top-level `tests` array.

### Output

- **No flags:** Print the JSON spec to stdout.
- **`--output <path>`:** Write the spec to that path.
- **`--merge <file>`:** Load the existing spec, and add each new test whose `testId` isn't already there. Validate the merged spec, then output it.

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
- `validate_spec` returned `valid: true`, or the validator printed `Validation PASSED`.
- With `--merge`, no two tests share a `testId`.

## Related commands

- `/doc-detective-validate`: Validate an existing spec again.
- `/doc-detective-test`: Run the spec.
