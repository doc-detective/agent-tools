---
description: Convert documentation procedures into Doc Detective test specifications and run them
---

# Test Documentation Command

Convert documented procedures into executable Doc Detective test specifications and run them to verify the documentation matches actual behavior.

## Usage

Provide documentation text or a file path. The command will:
1. Extract procedures from the documentation
2. Convert them to Doc Detective test specifications
3. Validate the test specs
4. Execute the tests
5. Analyze and report results

## Example

```
/doc-detective-plugin:test-docs path/to/docs/getting-started.md
```

Or provide inline documentation:

```
/doc-detective-plugin:test-docs
1. Navigate to https://example.com
2. Click the "Sign In" button
3. Enter your email
4. Click "Next"
5. Verify the dashboard loads
```
