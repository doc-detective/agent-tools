# Doc Detective

A Claude Code plugin for testing documentation procedures and validating that documented workflows match actual application behavior.

## Features

- **Doc Detective Testing Skill** - Full-featured skill for testing documentation procedures using Doc Detective framework
- **Test Documentation Command** - Convert markdown documentation into executable test specifications
- **Validate Tests Command** - Validate test specifications before execution

## Installation

### Option 1: Load Locally During Development

```bash
claude --plugin-dir ./doc-detective
```

Then use the plugin commands:
- `/doc-detective:doc-detective-testing` - Main skill for testing workflows
- `/doc-detective:test-docs` - Quick command to test documentation files
- `/doc-detective:validate-tests` - Validate test specifications

### Option 2: Install as a Plugin

Copy the plugin directory to your Claude Code plugins location or follow [Claude Code's plugin installation guide](https://code.claude.com/docs/en/discover-plugins).

## Requirements

- Doc Detective installed globally, via Docker, or accessible via npx:
  - **Global**: `doc-detective` command available
  - **Docker**: Docker installed and `doc-detective/doc-detective` image available
  - **NPX**: npx available (included with Node.js 15.1.0+)

## Usage

### Convert Documentation to Tests

```bash
/doc-detective:test-docs path/to/documentation.md
```

The skill will:
1. Extract step-by-step procedures from your documentation
2. Convert them to Doc Detective test specifications
3. Validate the test specs
4. Execute tests using Doc Detective
5. Report results with any failures mapped back to documentation sections

### Validate Test Specifications

```bash
/doc-detective:validate-tests test-spec.json
```

Validates structure before execution:
- Required fields present
- Action types recognized
- Parameter types correct

### Use the Core Skill

```bash
/doc-detective:doc-detective-testing <your request>
```

Full documentation testing workflow with complete control over interpretation, validation, and execution.

## Plugin Structure

```
doc-detective/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── skills/
│   └── doc-detective-testing/   # Core testing skill
│       ├── SKILL.md
│       ├── references/
│       │   └── actions.md       # Action reference
│       └── scripts/
│           └── validate-test.js # Validation script
├── commands/
│   ├── test-docs.md            # Test docs command
│   └── validate-tests.md       # Validate command
└── README.md
```

## Doc Detective Actions Reference

The plugin includes complete documentation for Doc Detective actions:

| Action | Purpose |
|--------|---------|
| `goTo` | Navigate to a URL |
| `click` | Click an element (prefer text-based) |
| `find` | Verify an element exists |
| `type` | Type text input |
| `httpRequest` | Make HTTP requests |
| `runShell` | Execute shell commands |
| `screenshot` | Capture screenshots |
| `wait` | Pause or wait for elements |
| `checkLink` | Verify URL returns OK |
| `loadVariables` | Load environment variables |
| `saveCookie`/`loadCookie` | Manage session persistence |
| `record`/`stopRecord` | Video recording |

See `skills/doc-detective-testing/references/actions.md` for detailed documentation.

## Examples

### Test a Login Procedure

Documentation:
```markdown
# Login Procedure

1. Navigate to https://example.com/login
2. Enter your username
3. Enter your password
4. Click "Sign In"
5. Verify you see the Dashboard
```

Use the skill:
```
/doc-detective-plugin:doc-detective-testing
Test this login procedure from our docs to ensure it still works
```

### Test Multiple Workflows

Create a test specification file `workflows.json`:

```json
{
  "tests": [
    {
      "testId": "signup-flow",
      "description": "New user signup",
      "steps": [
        {"goTo": "https://example.com/signup"},
        {"find": "Create Account"},
        {"type": {"keys": "newuser@example.com", "selector": "#email"}},
        {"click": "Sign Up"},
        {"find": "Welcome"}
      ]
    },
    {
      "testId": "password-reset",
      "description": "Forgot password flow",
      "steps": [
        {"goTo": "https://example.com/login"},
        {"click": "Forgot Password"},
        {"type": {"keys": "user@example.com", "selector": "#email"}},
        {"click": "Reset"},
        {"find": "Check your email"}
      ]
    }
  ]
}
```

Then execute:
```
/doc-detective-plugin:test-docs workflows.json
```

## Resources

- [Doc Detective Documentation](https://doc-detective.com)
- [Doc Detective GitHub](https://github.com/doc-detective/doc-detective)
- [Test Specification Format](https://doc-detective.com/docs/get-started/tests)
- [Actions Reference](https://doc-detective.com/docs/category/actions)

## License

MIT

## Contributing

To contribute improvements to this plugin, submit issues or pull requests to the repository.
