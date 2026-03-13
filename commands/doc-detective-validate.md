---
description: Validate Doc Detective test specifications or configuration files
skill: doc-detective-validate
---

# Validate Command

**Skill:** `doc-detective:validate`

Validate Doc Detective test specifications or configuration files to ensure they're correctly structured.

## Usage

Validate a test specification file or inline JSON:

```
/doc-detective:validate test-spec.json
```

```
/doc-detective:validate
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

```
/doc-detective:validate --config .doc-detective.json
```

## Entry Criteria

Confirm all of the following before starting. If any item is unavailable or non-discoverable, stop and ask the user to provide it.

| Criteria | How to find it |
|---|---|
| Test spec or config content to validate | Provided as a file path or inline JSON — ask user if missing |

## Exit Criteria

Before completing:

1. [ ] Validation executed against the provided input
2. [ ] Each error reported as: `[FIELD]: [ERROR REASON]`
3. [ ] Final result stated as `Validation PASSED` or `Validation FAILED`

## Workflow

### Validate Test Specification

Run the validator (try in order; stop and tell the user if none are available):

```bash
# Option 1
echo '<spec-json>' | node skills/doc-testing/scripts/validate-test.js --stdin
# Option 2
npx doc-detective validate --input <spec-file>
```

**Only report `Validation PASSED` when the output confirms no errors.** On failure, report each error as `[FIELD]: [ERROR REASON]`.

**Test spec checks:**

- `tests` array must exist and be non-empty
- Each test must have a non-empty `steps` array
- Each step must contain exactly one recognized Doc Detective action
- Action parameters must match expected types

### Validate Configuration File

Check the provided JSON against the doc-detective-common config schema. Report every field that fails as `[FIELD]: [ERROR REASON]`.

**Config checks:**

- `input`: must be a string or string array of valid glob patterns or file paths
- `recursive`: must be a boolean
- `output`: must be a valid directory path string
- `logLevel`: must be one of `silent`, `error`, `warning`, `info`, `debug`
- `browser`: must be an object (not a string)
- `env`: must be an object or `.env` file path string
- `defaultCommandTimeout`: must be a number (milliseconds)

**Valid config:**

```json
{ "input": ["docs/**/*.md"] }
```

**Invalid config:**

```json
{ "input": "docs/", "browser": "chrome", "logLevel": "verbose" }
```

Errors: `browser` must be object, `logLevel` value invalid.

See [doc-detective-common](https://github.com/doc-detective/doc-detective-common) for the full configuration schema.
