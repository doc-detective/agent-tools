---
name: doc-detective-validate
description: 'Check whether an existing Doc Detective test spec or config file (such as .doc-detective.json) is valid, and name each invalid field, without running any tests. To run tests, use doc-detective-test. To write a new spec, use doc-detective-generate.'
metadata:
  version: '2.1.3'
  organization: Doc Detective
  date: November 2026
  abstract: Validate Doc Detective test specifications or configuration files to ensure they are correctly structured.
  references: https://docs.doc-detective.com, https://github.com/doc-detective/doc-detective, https://github.com/doc-detective/doc-detective-common
  user-invocable: 'true'
user-invocable: true
---

# Validate Command

**Skill:** `doc-detective:doc-detective-validate`

## Goal

Tell the user whether a Doc Detective test specification or configuration file is valid, and name every field that isn't. The user, or the skill that called this one, decides whether to run, fix, or discard the input based on this verdict. A verdict that says `Validation PASSED` for an invalid file lets a broken spec reach a test run.

## Usage

Validate a test specification file:

```bash
/doc-detective-validate test-spec.json
```

Or run the command with no argument, and give the spec as inline JSON:

```bash
/doc-detective-validate
```

```json
{
  "tests": [{
    "testId": "login-flow",
    "steps": [
      { "goTo": "https://example.com/login" },
      { "click": "Sign In" }
    ]
  }]
}
```

Validate a configuration file:

```bash
/doc-detective-validate --config .doc-detective.json
```

## Guardrails

- **Report `Validation PASSED` only when a validator confirms that the input has no errors.** A missing or inconclusive check isn't a pass. When no validator can confirm the input, say so instead of giving a verdict. Callers act on this verdict without checking again.
- **Report every error as `[FIELD]: [ERROR REASON]`.** The user fixes the file from this list, so a missing field name leaves them searching.
- **Ask for the input when you don't have it.** When no file path or inline JSON was given, ask the user. Don't validate a file you found on your own.

## Choose a validator

Validators differ in how closely they track the installed Doc Detective engine. Use the first one that's available.

**MCP `validate_spec`.** When a tool named `validate_spec` (or `mcp__doc-detective__validate_spec`) is registered, call it. It tracks the live schema:

```javascript
validate_spec({
  object: <spec-or-config>,
  schemaKey: "spec_v3",   // or "config_v3" for config files
  addDefaults: true,
  format: "auto"
})
```

The tool returns `{valid, errors[], normalizedObject, schemaKey, schemaVersion}`. Report each entry of `errors[]` as `[instancePath]: [message]`. `valid: true` means `Validation PASSED`.

**Command-line validators.** Without the MCP tool, use these in order. When none is available, tell the user.

```bash
# Option 1
echo '<spec-json>' | node skills/doc-detective-test/scripts/doc-detective-validate-test.js --stdin
# Option 2: checks specs and inline tests without running them. Exit 0: all valid. Exit 1: some invalid; stdout names
# each file and field. Exit 2: usage error, bad config, or no tests found. Add --json for {valid, files[{path, valid, errors}]}.
npx doc-detective@5 validate <spec-file>
# Option 3, only if Option 2 fails with an unknown-command error (older Doc Detective): the spec is valid only when
# the printed plan lists it; exit 0 with no plan means it wasn't checked. If config sets `exitOnFail: false`, invalid
# inline steps are skipped and the file can still be listed, so treat the result as inconclusive. Exit 2 means the
# spec is invalid only when stderr names the spec file. Doesn't name the field.
npx doc-detective@5 --dry-run --input <spec-file>
```

See `_shared/MCP-USAGE.md` for tool names on each host, and for `log_observation` guidance when validation problems can't be resolved.

## What makes a test spec valid

- The `tests` array exists and isn't empty.
- Each test has a non-empty `steps` array.
- Each step contains exactly one recognized Doc Detective action.
- Action parameters have the expected types.

## What makes a configuration file valid

For a config file, call `validate_spec({object: <config>, schemaKey: "config_v3", addDefaults: true})` when the tool is registered, and report each `errors[]` entry as `[instancePath]: [message]`. Without the tool, check the JSON against the `doc-detective-common` config schema, and report each field that fails as `[FIELD]: [ERROR REASON]`.

- `input`: A string or string array of valid glob patterns or file paths.
- `recursive`: A boolean.
- `output`: A string, the path of the JSON results file, not a folder.
- `outputDir`: A string, the folder for run folders and reports.
- `logLevel`: One of `silent`, `error`, `warning`, `info`, `debug`.
- No other top-level keys. The schema rejects unknown keys.

**Valid config:**

```json
{ "input": ["docs/**/*.md"] }
```

**Invalid config:**

```json
{ "input": "docs/", "logLevel": "verbose", "recursive": "yes" }
```

Errors: `logLevel` isn't one of the allowed values, and `recursive` must be a boolean.

See the [`config_v3` schema](https://github.com/doc-detective/doc-detective/blob/main/src/common/src/schemas/src_schemas/config_v3.schema.json) for the full configuration schema.

## Done when

- A validator ran against the input you were given.
- Each error appears as `[FIELD]: [ERROR REASON]`.
- The result ends with `Validation PASSED` or `Validation FAILED`, or it tells the user that no validator could confirm the input, and why.
