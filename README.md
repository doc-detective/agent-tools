# Doc Detective Agent Tools

Agent tools for testing documentation procedures and validating that documented workflows match actual application behavior. Compatible with Gemini CLI, Claude Code, Cursor, Codex, OpenCode, GitHub Copilot, and other AI coding assistants that support plugins, skills, or commands.

- **Set up Doc Detective for a project.** Initialize Doc Detective in a project with automatic documentation detection, config generation, and test creation.
- **Generate tests.** Convert documentation into executable test specifications.
- **Run tests.** Execute tests against your application and report results.
- **Inject tests into your docs content.** Embed test steps close to associated documentation content.

## Installation

### Claude Code

1. Open Claude Code:

   ```bash
   claude
   ```

2. Add the Doc Detective plugin to Claude Code's plugin marketplace:

   ```text
   /plugin marketplace add doc-detective/agent-tools
   ```

3. Then install specific skill sets via:

   ```text
   /plugin install doc-detective@doc-detective
   ```

4. Ask Claude about Doc Detective, or use the `init` command to get started:

   ```text
   /doc-detective:init
   ```

### Gemini CLI

1. Install the extension:

   ```bash
   gemini extensions install https://github.com/doc-detective/agent-tools.git
   ```

2. Open Gemini CLI:

   ```bash
   gemini
   ```

3. Use Doc Detective commands in Gemini CLI:

   ```text
   /doc-detective:init
   ```

### Codex, Cursor, OpenCode, and other AI coding assistants

#### Option 1: Install with `npx skills`

> [!WARNING]
> `npx skills` only installs skills, not agents, commands, or other tools. For full functionality, consider [manual installation](#option-4-manual-installation).

Install these skills with the [`skills`](https://github.com/vercel-labs/skills) package from Vercel. This works with Claude Code, Cursor, Codex, OpenCode, and other AI coding tools.

```bash
npx skills add doc-detective/agent-tools
```

Follow the prompts. The CLI auto-detects which AI tools you have installed and places the skills in the appropriate directories.

#### Option 2: Manual Installation

#### Copy to your project directory

```bash
git clone https://github.com/doc-detective/agent-tools.git

cp agent-tools/agents .{agent-dir}/agents      # Agents
cp agent-tools/commands .{agent-dir}/commands  # Commands
cp agent-tools/skills .{agent-dir}/skills      # Skills
```

> [!IMPORTANT]
> Adjust the path based on your agent's expected skill/plugin directory. For example, `.github/` for GitHub Copilot, `.cursor/` for Cursor, etc.

## Usage

### Bootstrap Doc Detective for a Project

```bash
/doc-detective:init
```

Initializes Doc Detective in your repository by:
1. Detecting documentation files
2. Generating a minimal configuration
3. Creating tests for identified procedures
4. Running tests
5. Iteratively fixing failures with confidence-based suggestions

### Convert Documentation to Tests

```bash
/doc-detective:generate path/to/documentation.md
```

Identify testable procedures and convert them into Doc Detective test specifications.

### Run Tests

```bash
/doc-detective:test path/to/documentation.md
```

Runs tests from docs or test specification files:

1. Extracts step-by-step procedures from your documentation.
2. Converts them to Doc Detective test specifications.
3. Validates the test specs.
4. Executes tests using Doc Detective.
5. Reports results with any failures mapped back to documentation sections.

### Validate Test Specifications

```bash
/doc-detective:validate test-spec.json
```

Validates structure before execution:

- Required fields present
- Action types recognized
- Parameter types correct

### Inject Tests into Documentation

```bash
/doc-detective:inject tests/spec.yaml docs/procedure.md --apply
```

Takes a well-formed test specification and injects test steps as inline comments into the associated documentation content so you don't have to maintain separate files.

## Doc Detective Actions Reference

The plugin includes complete documentation for Doc Detective actions:

| Action                    | Purpose                              |
| ------------------------- | ------------------------------------ |
| `goTo`                    | Navigate to a URL                    |
| `click`                   | Click an element (prefer text-based) |
| `find`                    | Verify an element exists             |
| `type`                    | Type text input                      |
| `httpRequest`             | Make HTTP requests                   |
| `runShell`                | Execute shell commands               |
| `screenshot`              | Capture screenshots                  |
| `wait`                    | Pause or wait for elements           |
| `checkLink`               | Verify URL returns OK                |
| `loadVariables`           | Load environment variables           |
| `saveCookie`/`loadCookie` | Manage session persistence           |
| `record`/`stopRecord`     | Video recording                      |

See `skills/doc-testing/references/actions.md` for detailed documentation.

## Inline Test Injection

Inject test steps from separate spec files directly into documentation as inline comments:

```bash
/doc-detective:inject tests/login.yaml docs/login.md --apply
```

**Before:**

```markdown
1. Go to [Login Page](https://example.com/login).
2. Click **Sign In**.
```

**After:**

```markdown
1. Go to [Login Page](https://example.com/login).
<!-- step {"goTo":"https://example.com/login"} -->
2. Click **Sign In**.
<!-- step {"click":"Sign In"} -->
```

Steps are matched to content using semantic patterns (links, bold text, action verbs) and placed close to their associated documentation.

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
/doc-detective:test path/to/file.md this login procedure from our docs to make sure it still works
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
        { "goTo": "https://example.com/signup" },
        { "find": "Create Account" },
        { "type": { "keys": "newuser@example.com", "selector": "#email" } },
        { "click": "Sign Up" },
        { "find": "Welcome" }
      ]
    },
    {
      "testId": "password-reset",
      "description": "Forgot password flow",
      "steps": [
        { "goTo": "https://example.com/login" },
        { "click": "Forgot Password" },
        { "type": { "keys": "user@example.com", "selector": "#email" } },
        { "click": "Reset" },
        { "find": "Check your email" }
      ]
    }
  ]
}
```

Then execute:

```
/doc-detective:test workflows.json
```

## Resources

- [Doc Detective Documentation](https://doc-detective.com)
- [Doc Detective GitHub](https://github.com/doc-detective/doc-detective)
- [Test Specification Format](https://doc-detective.com/docs/get-started/tests)
- [Actions Reference](https://doc-detective.com/docs/category/actions)

## License

AGPL3

## Contributing

To contribute improvements to this plugin, submit issues or pull requests to the repository.
