# Doc Detective Agent Tools

Agent tools for testing documentation procedures and validating that documented workflows match actual application behavior. Compatible with Gemini CLI, Claude Code, Cursor, Codex, OpenCode, GitHub Copilot, and other AI coding agents that support plugins, skills, or commands.

- **Set up Doc Detective for a project.** Initialize Doc Detective in a project with automatic documentation detection, config generation, and test creation.
- **Generate tests.** Convert documentation into executable test specifications.
- **Run tests.** Execute tests against your application and report results.
- **Inject tests into your docs content.** Embed test steps close to associated documentation content.
- **Install the Doc Detective GitHub Action.** Add a Doc Detective GitHub Actions workflow for automated documentation testing in CI.

## Installation

### Quick install

The fastest way to install the agent tools is the Doc Detective CLI:

```bash
npx doc-detective install-agents
```

It detects which supported agents are installed on your machine, prompts you to choose which to configure, and invokes each agent's native install mechanism. Re-run any time to update to the latest version.

To target a specific agent non-interactively:

```bash
npx doc-detective install-agents --agent claude-code --scope project --yes
```

Supported `--agent` ids: `claude-code`, `copilot-cli`, `gemini-cli`, `codex`, `qwen-code`, `opencode`.

Useful flags:

- `--scope project` or `--scope global` — skip the scope prompt.
- `--yes` — non-interactive; requires `--agent` and `--scope`.
- `--force` — reinstall even if already up to date.
- `--dry-run` — print the actions that would be taken without executing them.

Head to the per-agent sections below if you prefer the native install flow or need to troubleshoot.

### Claude Code

```bash
npx doc-detective install-agents --agent claude-code
```

The command auto-detects Claude Code, prompts for install scope (project or user-global) if you don't pass `--scope`, then invokes Claude Code's native plugin management. Re-run any time to update.

If the `claude` binary is not on your PATH but `~/.claude/` exists, the command edits your settings file directly and Claude Code will prompt to complete the install on its next launch.

#### Fallback: install from inside Claude Code

1. Open Claude Code:

   ```bash
   claude
   ```

2. Add the Doc Detective marketplace and plugin:

   ```text
   /plugin marketplace add doc-detective/agent-tools
   /plugin install doc-detective@doc-detective
   ```

3. Ask about Doc Detective, or use the `init` command to get started:

   ```text
   /doc-detective-init
   ```

### Gemini CLI

```bash
npx doc-detective install-agents --agent gemini-cli
```

This invokes `gemini extensions install` under the hood with auto-update enabled. Gemini CLI installs extensions user-globally — the `--scope` flag has no effect for this agent.

#### Fallback: `gemini extensions install`

```bash
gemini extensions install https://github.com/doc-detective/agent-tools.git --auto-update
gemini
```

Ask about Doc Detective, or use the `init` command to get started:

```text
/doc-detective-init
```

### Copilot CLI

```bash
npx doc-detective install-agents --agent copilot-cli
```

The command invokes Copilot CLI's native plugin management to add the marketplace and install the plugin. Copilot CLI installs plugins user-globally — the `--scope` flag has no effect.

If the `copilot` binary is not on your PATH, install it first: `npm install -g @github/copilot` (or see the [Copilot CLI install docs](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli)). You must also be logged in with `copilot login`.

#### Fallback: install from inside Copilot CLI

1. Open Copilot CLI:

   ```bash
   copilot
   ```

2. Install the Doc Detective plugin:

   ```text
   /plugin marketplace add doc-detective/agent-tools
   /plugin install doc-detective@doc-detective
   ```

3. Ask about Doc Detective, or use the `init` command to get started:

   ```text
   /doc-detective-init
   ```

### Qwen Code

```bash
npx doc-detective install-agents --agent qwen-code
```

The command invokes `qwen extensions install` non-interactively with auto-update enabled. Qwen Code installs extensions user-globally — the `--scope` flag has no effect.

#### Fallback: `qwen extensions install`

```bash
qwen extensions install https://github.com/doc-detective/agent-tools
qwen extensions install doc-detective:doc-detective
qwen
```

Ask about Doc Detective, or use the `init` command to get started:

```text
/doc-detective-init
```

### OpenCode

```bash
# User-global (default)
npx doc-detective install-agents --agent opencode

# Or per-project
npx doc-detective install-agents --agent opencode --scope project
```

The command fetches the agent-tools bundle and copies skills, the runtime plugin, hooks, and agents into the appropriate scope directory (`~/.config/opencode/` or `./.opencode/`). OpenCode auto-discovers them on next launch.

The plugin provides `tool.execute.before` and `tool.execute.after` hooks that automatically validate test specs, block common anti-patterns, suggest running tests after doc edits, and check for Doc Detective CLI availability.

#### Fallback: manual install

1. Clone the repository:

   ```bash
   git clone https://github.com/doc-detective/agent-tools.git
   ```

2. Copy the plugin contents to your project's `.opencode/` directory:

   ```bash
   mkdir -p .opencode/plugins
   cp agent-tools/plugins/doc-detective/opencode-plugin.mjs .opencode/plugins/
   cp -r agent-tools/plugins/doc-detective/hooks .opencode/
   cp -r agent-tools/plugins/doc-detective/skills .opencode/
   cp -r agent-tools/plugins/doc-detective/agents .opencode/
   ```

3. Start OpenCode and ask about Doc Detective, or use the `init` command:

   ```text
   /doc-detective-init
   ```

### Codex

```bash
# User-global (default)
npx doc-detective install-agents --agent codex

# Or per-project
npx doc-detective install-agents --agent codex --scope project
```

The command fetches doc-detective's skills from GitHub and copies them into the user's (or project's) `.agents/skills/` directory. Codex auto-discovers skills on its next launch.

#### Fallback: manual install

1. Clone the repo and copy the plugin and marketplace into your project:

   ```bash
   git clone https://github.com/doc-detective/agent-tools.git
   cp -r agent-tools/plugins/doc-detective ./plugins/doc-detective
   mkdir -p .agents/plugins
   cp agent-tools/.agents/plugins/marketplace.json .agents/plugins/marketplace.json
   ```

2. Open Codex and install the plugin from the marketplace:

   ```bash
   codex
   ```

3. Ask about Doc Detective, or use the `init` command to get started:

   ```text
   /doc-detective-init
   ```

### Cursor and other agents

#### Option 1: Install with `npx skills`

> [!WARNING]
> `npx skills` only installs skills, not agents, commands, or other tools. For full functionality, consider [manual installation](#option-2-manual-installation).

Install these skills with the [`skills`](https://github.com/vercel-labs/skills) package from Vercel. This works with Claude Code, Cursor, Codex, OpenCode, and other AI coding tools.

```bash
npx skills add doc-detective/agent-tools
```

Follow the prompts. The CLI auto-detects which AI tools you have installed and places the skills in the appropriate directories.

#### Option 2: Manual Installation

#### Copy to your project directory

```bash
git clone https://github.com/doc-detective/agent-tools.git

cp -r agent-tools/agents .{agent-dir}/agents      # Agents
cp -r agent-tools/commands .{agent-dir}/commands  # Commands
cp -r agent-tools/skills .{agent-dir}/skills      # Skills
cp -r agent-tools/hooks .{agent-dir}/hooks        # Hooks
```

> [!IMPORTANT]
> Adjust the destination path based on your agent's expected skill/plugin directory. For example, `.agents` for Codex, `.cursor` for Cursor, etc.

## Usage

### Bootstrap Doc Detective for a Project

```bash
/doc-detective-init
```

Initializes Doc Detective in your repository by:
1. Detecting documentation files
2. Generating a minimal configuration
3. Creating tests for identified procedures
4. Running tests
5. Iteratively fixing failures with confidence-based suggestions

### Convert Documentation to Tests

```bash
/doc-detective-generate path/to/documentation.md
```

Identify testable procedures and convert them into Doc Detective test specifications.

### Run Tests

```bash
/doc-detective-test path/to/documentation.md
```

Runs tests from docs or test specification files:

1. Extracts step-by-step procedures from your documentation.
2. Converts them to Doc Detective test specifications.
3. Validates the test specs.
4. Executes tests using Doc Detective.
5. Reports results with any failures mapped back to documentation sections.

### Validate Test Specifications

```bash
/doc-detective-validate test-spec.json
```

Validates structure before execution:

- Required fields present
- Action types recognized
- Parameter types correct

### Inject Tests into Documentation

```bash
/doc-detective-inject tests/spec.yaml docs/procedure.md --apply
```

Takes a well-formed test specification and injects test steps as inline comments into the associated documentation content so you don't have to maintain separate files.

### Install the Doc Detective GitHub Action

```bash
/doc-detective-install-github-action [options]
```

Installs a Doc Detective GitHub Actions workflow for automated documentation testing in CI:

1. Detects project context (config files, docs directory, existing workflows).
2. Generates a workflow YAML with configurable triggers and optional features.
3. Writes the workflow to `.github/workflows/doc-detective.yml`.
4. Reports manual steps needed (e.g., enabling Actions permissions).

| Option | Default | Description |
|--------|---------|-------------|
| `--trigger <event>` | `pull_request` | Workflow trigger (`pull_request`, `push`, `schedule`, etc.) |
| `--exit-on-fail` | false | Fail CI when tests fail |
| `--create-pr-on-change` | false | Open a PR when files change during test execution |
| `--create-issue-on-fail` | false | Create a GitHub issue when tests fail |
| `--integrations <list>` | (none) | Comma-separated integrations to mention in issues |
| `--ci` | false | Non-interactive; use defaults, no prompts |

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

See `skills/doc-detective-doc-testing/references/actions.md` for detailed documentation.

## Hooks

The plugin includes hooks that activate automatically when installed. Hooks provide deterministic guardrails that run at key points during your agent session — no configuration required.

| Hook | Trigger | Behavior |
|------|---------|----------|
| **Test spec validation** | After editing a `.json` test spec | Automatically validates the spec structure and reports errors |
| **Action anti-pattern blocker** | Before writing test spec content | Blocks the common mistake of `{"action": "goTo"}` — the correct format is `{"goTo": "url"}` |
| **Documentation test reminder** | After editing a documentation file | Suggests running `/doc-detective-test` if the project has a Doc Detective config |
| **Installation check** | Session start | Checks if the Doc Detective CLI is available and provides installation instructions if not |
| **Test spec formatting** | After editing a `.json` test spec | Normalizes JSON formatting to 2-space indentation |
| **Inline test warning** | After editing a doc with inline tests | Warns that inline Doc Detective test comments may need updating |

Hooks are supported in Claude Code, Gemini CLI, and OpenCode. Codex supports skills natively via the plugin manifest. Other agents can use the shared scripts in `hooks/scripts/` with their own hook configuration.

## Inline Test Injection

Inject test steps from separate spec files directly into documentation as inline comments:

```bash
/doc-detective-inject tests/login.yaml docs/login.md --apply
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
/doc-detective-test path/to/file.md this login procedure from our docs to make sure it still works
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
/doc-detective-test workflows.json
```

## Resources

- [Doc Detective Documentation](https://doc-detective.com)
- [Doc Detective GitHub](https://github.com/doc-detective/doc-detective)
- [Test Specification Format](https://doc-detective.com/docs/get-started/doc-detective-tests)
- [Actions Reference](https://doc-detective.com/docs/category/actions)

## Repository Structure

Source content lives in `src/`. The build system (`npm run build`) generates downstream artifact directories that consumers install:

| Directory | Description |
|-----------|-------------|
| `src/agents/` | Agent definitions (source of truth) |
| `src/skills/` | Skill implementations — SKILL.md, references/, scripts/ (source of truth) |
| `src/hooks/` | Hook scripts and platform-specific configs (source of truth) |
| `agents/` | Copied from `src/agents/` (build artifact) |
| `skills/` | Copied from `src/skills/` (build artifact) |
| `hooks/` | Copied from `src/hooks/` (build artifact) |
| `commands/*.md` | Generated from user-invocable skills (build artifact) |
| `commands/doc-detective/*.toml` | Generated from command .md files for Gemini CLI (build artifact) |
| `plugins/doc-detective/` | Copied from `agents/`, `skills/`, and `hooks/` (build artifact) |
| `plugins/doc-detective/opencode-plugin.mjs` | OpenCode plugin — wraps hook scripts as OpenCode hooks (build artifact) |
| `.agents/plugins/marketplace.json` | Codex marketplace pointing to `plugins/doc-detective/` |

> [!NOTE]
> Do not edit files in `agents/`, `skills/`, `hooks/`, `commands/`, or `plugins/` directly. Edit the source in `src/` and run `npm run build`.

## License

AGPL3

## Contributing

To contribute improvements to this plugin, submit issues or pull requests to the repository.
