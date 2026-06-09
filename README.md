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
npx doc-detective install agents
```

It detects which supported agents are installed on your machine, prompts you to choose which to configure, and invokes each agent's native install mechanism. Re-run any time to update to the latest version.

> **Backwards compatibility:** The older `doc-detective install-agents` form still works as a hidden alias, so existing scripts and CI jobs don't need to change.

To target a specific agent non-interactively:

```bash
npx doc-detective install agents --agent claude --scope project --yes
```

Supported `--agent` ids: `claude`, `copilot`, `gemini`, `codex`, `qwen`, `opencode`.

Useful flags:

- `--scope project` or `--scope global` — skip the scope prompt.
- `--yes` — non-interactive; requires `--agent` and `--scope`.
- `--force` — reinstall even if already up to date.
- `--dry-run` — print the actions that would be taken without executing them.

Head to the per-agent sections below if you prefer the native install flow or need to troubleshoot.

> **Note:** `install agents` is one subcommand in the Doc Detective CLI's broader `install` group. Other subcommands (`install runtime`, `install browsers`, `install status`, `install all`) manage the CLI's lazy-loaded runtime dependencies. See the [Doc Detective documentation](https://doc-detective.com) for details.

### Automatic prompt during npm install

When you run `npm install doc-detective` in an interactive terminal, the CLI checks for supported coding agents. If it detects agents without doc-detective tools installed, you see a prompt:

```
Detected coding agents that may be missing doc-detective tools: Claude Code, Gemini CLI.
? Install doc-detective agent tools now? (y/N)
```

Answer **y** to launch `install agents` with the detected agents pre-selected, then choose the install scope (global or project). Answer **n** to skip — the CLI prints a reminder to run `npx doc-detective install agents` later.

The prompt is skipped when:

- `CI` environment variable is set
- `DOC_DETECTIVE_SKIP_AGENT_PROMPT` environment variable is set
- stdin or stdout is not a TTY (piped installs, redirected output, non-interactive shells)

To disable the prompt permanently, add `DOC_DETECTIVE_SKIP_AGENT_PROMPT=1` to your shell profile.

### Claude Code

```bash
npx doc-detective install agents --agent claude
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
npx doc-detective install agents --agent gemini
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
npx doc-detective install agents --agent copilot
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
npx doc-detective install agents --agent qwen
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
npx doc-detective install agents --agent opencode

# Or per-project
npx doc-detective install agents --agent opencode --scope project
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
npx doc-detective install agents --agent codex

# Or per-project
npx doc-detective install agents --agent codex --scope project
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

What installing the plugin gives you:

- **Skills.** Running `codex plugin marketplace add <path>` then `codex plugin add doc-detective@doc-detective` loads the Doc Detective skills into Codex.
- **MCP tools.** The plugin bundles its MCP server in `plugins/doc-detective/.mcp.json`, so the remote MCP tools auto-register on install — no manual `~/.codex/config.toml` edit required.
- **Hooks.** Codex supports lifecycle hooks, but the tool-matched guardrails (validation, anti-pattern blocking, etc.) key on Claude's `Edit`/`Write` tool names, which Codex does not use — so they do not currently fire on Codex. They run on Claude Code, Gemini CLI, and OpenCode.

### Cursor

Doc Detective ships as a [Cursor plugin](https://cursor.com/docs/plugins) (Cursor 2.5+).

#### Install locally (works on any plan — Free, Pro, Teams)

This is the method for an individual machine. It needs no marketplace and no Teams plan.

1. Clone the repo:

   ```bash
   git clone https://github.com/doc-detective/agent-tools.git
   ```

2. Copy the plugin folder into Cursor's local plugins directory. Copy
   `plugins/doc-detective` itself (the folder that contains `.cursor-plugin/plugin.json`):

   **macOS / Linux:**

   ```bash
   mkdir -p ~/.cursor/plugins/local                 # create the dir on a fresh install
   rm -rf ~/.cursor/plugins/local/doc-detective     # remove any previous copy first
   cp -r agent-tools/plugins/doc-detective ~/.cursor/plugins/local/doc-detective
   ```

   **Windows (PowerShell):**

   ```powershell
   $dest = "$HOME\.cursor\plugins\local\doc-detective"
   New-Item -ItemType Directory -Force -Path "$HOME\.cursor\plugins\local" | Out-Null
   Remove-Item -Recurse -Force $dest -ErrorAction SilentlyContinue
   Copy-Item -Recurse agent-tools\plugins\doc-detective $dest
   ```

   (Creating the directory first handles a fresh Cursor install; removing any previous copy
   avoids nesting the plugin inside an existing `doc-detective/` folder.)

   When done, the manifest must sit at
   `~/.cursor/plugins/local/doc-detective/.cursor-plugin/plugin.json` (on Windows,
   `%USERPROFILE%\.cursor\plugins\local\doc-detective\.cursor-plugin\plugin.json`) — i.e.
   **not** double-nested under a second `doc-detective/` folder.

3. Reload Cursor: open the Command Palette (`Cmd/Ctrl+Shift+P`) and run
   **Developer: Reload Window** (or quit and reopen Cursor).

4. Verify: in Agent chat, type `/` and confirm the `/doc-detective-*` commands appear.
   Then get started:

   ```text
   /doc-detective-init
   ```

> **Developing on the plugin?** Symlink instead of copying so edits show up on reload:
>
> ```bash
> mkdir -p ~/.cursor/plugins/local
> rm -rf ~/.cursor/plugins/local/doc-detective   # clear any existing copy first
> ln -s "$PWD/agent-tools/plugins/doc-detective" ~/.cursor/plugins/local/doc-detective
> ```

#### With the `cursor-agent` CLI

The [Cursor CLI](https://cursor.com/docs/cli) has **no marketplace** — load the plugin with
`--plugin-dir` (this loads the skills, agent, rule, and MCP server):

```bash
cursor-agent --plugin-dir "$PWD/agent-tools/plugins/doc-detective"
```

#### Via Claude Code skills/subagents (third-party import)

Cursor can load resources from other ecosystems. In **Settings → Rules, Skills, Subagents**,
enable **"Include third-party Plugins, Skills and other configs"** — Cursor then imports
skills and subagents from Claude Code's `~/.claude/skills` and `~/.claude/agents` (and Codex
configs). So if you already run Doc Detective in Claude Code (or `npx skills add
doc-detective/agent-tools`), this toggle surfaces it in Cursor with no separate Cursor
plugin. (It imports *everything* from those ecosystems, so the dedicated Cursor plugin above
is more targeted.)

#### Distribute to a team (Teams / Enterprise plans only)

Team Marketplaces are **not available on individual (Free/Pro) plans** — if you don't see
the option below, use the local install above. On a Teams or Enterprise plan, an admin can
import this repo as a custom marketplace from the **web dashboard** (not the in-app
settings):

1. Go to [cursor.com](https://cursor.com) → **Dashboard → Settings → Plugins → Team
   Marketplaces → Import**.
2. Paste `https://github.com/doc-detective/agent-tools` and review the parsed plugins
   (Cursor reads the repo's `.cursor-plugin/marketplace.json`).
3. Assign access groups, mark the plugin Required or Optional, and save.

(Auto-refresh needs the Cursor GitHub App and updates at most every 10 minutes; re-import
the URL to pick up newly added plugins.)

#### Official marketplace (once published)

After the plugin is listed on the [Cursor marketplace](https://cursor.com/marketplace),
install it with `/add-plugin doc-detective` in Agent chat, or "Add to Cursor" on the
marketplace page.

What installing the plugin gives you:

- **Skills.** The Doc Detective skills load into Cursor and are invocable as slash
  commands (`/doc-detective-test`, `/doc-detective-generate`, `/doc-detective-validate`,
  `/doc-detective-inject`, `/doc-detective-init`, `/doc-detective-install-github-action`).
- **Agent.** The `doc-detective-specialist` subagent is available for documentation-testing tasks.
- **Rule.** A persistent "docs as tests" rule reminds the agent to validate and test
  documented procedures (and to use the correct `{ "action-name": ... }` spec format)
  when you edit docs or test specs.
- **MCP tools.** The plugin registers the Doc Detective remote MCP server inline in its
  manifest, so the MCP tools are available without a manual `.cursor/mcp.json` edit.
- **Hooks.** Cursor's hook protocol differs from Claude's, so the plugin routes Cursor's
  `sessionStart` and `afterFileEdit` events through an adapter
  (`hooks/scripts/cursor-hook-adapter.js`) that reuses the shared hook scripts —
  giving you install detection, spec validation, formatting, and anti-pattern guidance.
  See [docs/README.cursor.md](docs/README.cursor.md) for details.

### Other agents

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

## MCP server

Doc Detective hosts a remote Model Context Protocol server at `https://agency.doc-detective.com/mcp` that exposes three tools to MCP-compatible clients:

| Tool | Purpose |
|------|---------|
| `detect_tests` | Parse documentation content into a resolved Doc Detective test plan. |
| `validate_spec` | Validate a spec, config, test, step, or context object against `doc-detective-common` schemas. |
| `log_observation` | Send anonymous, agent-initiated feedback to Doc Detective for roadmap improvement. Never carries user content. |

When you install the plugin or extension, the MCP server is auto-registered for:

- **Claude Code** (via plugin)
- **Gemini CLI** (via extension)
- **Qwen Code** (via extension)
- **OpenCode** (via plugin)
- **Codex** (via the plugin's bundled `.mcp.json`)

For the hosts below, paste the snippet into the indicated config file:

### Cursor — `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "doc-detective": {
      "url": "https://agency.doc-detective.com/mcp",
      "headers": { "X-DD-Client": "cursor" }
    }
  }
}
```

### Codex — `~/.codex/config.toml`

Installing the Codex plugin auto-registers the MCP server from its bundled `.mcp.json`. If you installed only the skills (e.g. via `npx skills`), register it manually instead:

```toml
[mcp_servers.doc-detective]
url = "https://agency.doc-detective.com/mcp"
http_headers = { "X-DD-Client" = "codex" }
```

### Copilot CLI — `~/.copilot/mcp-config.json`

```json
{
  "mcpServers": {
    "doc-detective": {
      "type": "http",
      "url": "https://agency.doc-detective.com/mcp",
      "headers": { "X-DD-Client": "copilot-cli" }
    }
  }
}
```

### Privacy

The server only receives the arguments you pass to its tools. The `X-DD-Client` header identifies the host (e.g., `claude-code`, `gemini-cli`) — no personally identifying information. The `log_observation` tool is reserved for abstract feedback only — never file paths, URLs, selectors, or spec contents. To opt out, remove the `mcpServers` (or `mcp`) entry from your host's config.

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
| `plugins/doc-detective/.codex-plugin/plugin.json` | Codex plugin manifest — version synced from package.json; includes `mcpServers: "./.mcp.json"` when Codex MCP servers are enabled (build artifact) |
| `plugins/doc-detective/.mcp.json` | Codex MCP registration generated from enabled `src/mcp-servers.json` entries; removed when none are enabled (build artifact) |
| `.agents/plugins/marketplace.json` | Codex marketplace pointing to `plugins/doc-detective/` |

> [!NOTE]
> Do not edit files in `agents/`, `skills/`, `hooks/`, `commands/`, or `plugins/` directly. Edit the source in `src/` and run `npm run build`.

## License

AGPL3

## Contributing

To contribute improvements to this plugin, submit issues or pull requests to the repository.
