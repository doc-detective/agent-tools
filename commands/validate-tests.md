---
description: Validate Doc Detective test specifications before execution
---

# Validate Tests Command

Validate Doc Detective test specifications to ensure they're correctly structured before running them.

## Usage

Provide a test specification file or JSON content:

```
/doc-detective-plugin:validate-tests test-spec.json
```

Or provide inline JSON:

```
/doc-detective-plugin:validate-tests
{
  "tests": [
    {
      "testId": "login-flow",
      "description": "Verify login procedure",
      "steps": [
        {
          "description": "Navigate to login",
          "goTo": "https://example.com/login"
        },
        {
          "description": "Click Sign In",
          "click": "Sign In"
        }
      ]
    }
  ]
}
```

## Validation Checks

- Required `tests` array exists and is non-empty
- Each test has a non-empty `steps` array
- Each step contains a recognized Doc Detective action
- Action parameters match expected types
