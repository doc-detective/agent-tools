# Doc Detective for Cursor

Doc Detective ships as a [Cursor plugin](https://cursor.com/docs/plugins) (Cursor 2.5+).
This document covers what the plugin bundles, how the Cursor-specific pieces work, and
how to test it locally.

## Install

> **Which method?** On an **individual (Free/Pro)** plan, use **Local install** below — it
> works on every plan and needs no marketplace. The repo-import marketplace is a
> **Teams/Enterprise**-only feature (see "Team distribution"). `/add-plugin` works once the
> plugin is on the official marketplace.

### Local install (any plan)

Cursor loads unpacked plugins from `~/.cursor/plugins/local/<name>/`, where the folder
contains `.cursor-plugin/plugin.json` at its root.

1. Clone the repo:

   ```bash
   git clone https://github.com/doc-detective/agent-tools.git
   ```

2. Copy `plugins/doc-detective` into the local plugins directory:

   ```bash
   # macOS / Linux — remove any previous copy first to avoid double-nesting
   rm -rf ~/.cursor/plugins/local/doc-detective
   cp -r agent-tools/plugins/doc-detective ~/.cursor/plugins/local/doc-detective
   ```

   ```powershell
   # Windows (PowerShell)
   Remove-Item -Recurse -Force "$HOME\.cursor\plugins\local\doc-detective" -ErrorAction SilentlyContinue
   Copy-Item -Recurse agent-tools\plugins\doc-detective "$HOME\.cursor\plugins\local\doc-detective"
   ```

   Confirm the manifest landed at
   `~/.cursor/plugins/local/doc-detective/.cursor-plugin/plugin.json` (not double-nested).

3. Run **Developer: Reload Window** from the Command Palette (or restart Cursor).

4. In Agent chat, type `/` and confirm the `/doc-detective-*` commands appear.

For iterative development, symlink instead of copying so edits are picked up on reload:

```bash
ln -s "$PWD/agent-tools/plugins/doc-detective" ~/.cursor/plugins/local/doc-detective
```

You can also drive it headlessly with the [Cursor CLI](https://cursor.com/docs/cli):

```bash
curl -fsSL https://cursor.com/install | bash   # installs `cursor-agent`
cursor-agent --plugin-dir "$PWD/agent-tools/plugins/doc-detective"
```

### Team distribution (Teams / Enterprise only)

> Not available on individual (Free/Pro) plans — if there's no **Team Marketplaces**
> section in your dashboard, use the local install above.

A team admin imports this repo as a custom marketplace from the **web dashboard** (not the
in-app settings):

1. [cursor.com](https://cursor.com) → **Dashboard → Settings → Plugins → Team
   Marketplaces → Import**.
2. Paste `https://github.com/doc-detective/agent-tools`; Cursor reads the repo-root
   `.cursor-plugin/marketplace.json`, which lists the `doc-detective` plugin with
   `source: ./plugins/doc-detective`.
3. Assign access groups, mark the plugin Required or Optional, and save. (Auto-refresh
   needs the Cursor GitHub App and runs at most every 10 minutes; re-import the URL to
   pick up newly added plugins.)

### Official marketplace (once published)

```text
/add-plugin doc-detective
```

Or "Add to Cursor" from [cursor.com/marketplace](https://cursor.com/marketplace).

## What's in the manifest

The manifest lives at `plugins/doc-detective/.cursor-plugin/plugin.json` and is generated
by `build.js` from the same `src/` sources as the other harnesses. It declares:

| Field | Value | Notes |
| --- | --- | --- |
| `skills` | `./skills/` | Invocable as `/doc-detective-*` slash commands |
| `agents` | `./agents/` | `doc-detective-specialist` subagent |
| `rules` | `./rules/` | One `.mdc` "docs as tests" rule |
| `hooks` | `./hooks/cursor-hooks.json` | Routed through the adapter (below) |
| `mcpServers` | inline object | Doc Detective remote MCP, `type: "http"` |

> Commands are intentionally **not** shipped as a separate `commands/` directory.
> Cursor makes skills invocable as `/skill-name`, so the skills already provide the
> slash-command experience, and `plugins/doc-detective/` is shared with the Claude and
> Codex manifests, which deliberately avoid a `commands/` dir to prevent double-exposure.

## Rules

`src/rules/doc-detective.md` is the canonical, harness-neutral rule source. `build.js`
renders it to `plugins/doc-detective/rules/doc-detective.mdc` for Cursor. The rule is
scoped with `globs` to documentation and Doc Detective spec files and reminds the agent
to validate/test documented procedures and to use the correct Doc Detective action
format (the action name **is** the JSON key).

## Hooks: the Cursor adapter

Cursor's hook protocol differs from the Claude/Gemini protocol the shared hook scripts
speak:

| Concern | Claude/Gemini scripts | Cursor |
| --- | --- | --- |
| Edit event | `PostToolUse` matched on `Edit`/`Write` | `afterFileEdit` |
| Session event | `SessionStart` | `sessionStart` |
| Block event | `PreToolUse` (exit 2) | `preToolUse` / `beforeShellExecution` … |
| Script stdin | `{ tool_input: { file_path, content, new_string } }` | `{ file_path, edits: [...] }` / `{ tool_name, tool_input }` |
| Inform agent | `{ "additionalContext": "…" }` on stdout | `{ "agent_message": "…" }` (or `additional_context` at sessionStart) |
| Block | message on stderr + exit 2 | `{ "permission": "deny", … }` + exit 2 |

Rather than fork every script, `hooks/scripts/cursor-hook-adapter.js` translates between
the two. `cursor-hooks.json` wires each event to the adapter with the target script as an
argument:

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      { "command": "node \"${CURSOR_PLUGIN_ROOT}/hooks/scripts/cursor-hook-adapter.js\" session-start-check-install.sh", "timeout": 20 }
    ],
    "afterFileEdit": [
      { "command": "node \"${CURSOR_PLUGIN_ROOT}/hooks/scripts/cursor-hook-adapter.js\" pre-edit-block-action-antipattern.js", "timeout": 10 },
      { "command": "node \"${CURSOR_PLUGIN_ROOT}/hooks/scripts/cursor-hook-adapter.js\" post-edit-validate-test-spec.js", "timeout": 30 }
    ]
  }
}
```

Behavior:

- **`sessionStart`** → install detection; surfaced via `additional_context`.
- **`afterFileEdit`** → spec validation, formatting, testing suggestions, inline-test
  warnings, and anti-pattern detection. Because the edit has already been written, the
  anti-pattern check surfaces a corrective `agent_message` rather than a hard block.
- The adapter **can** hard-block (`permission: "deny"` + exit 2) when a script signals a
  block under a pre-gate event such as `preToolUse`. Pre-write blocking of the
  anti-pattern depends on Cursor exposing edit content on `preToolUse`; confirm the exact
  payload during local verification before wiring it (see below).

## Verifying locally

```bash
# unit + structural tests for the Cursor target
npm run test:cursor-plugin

# exercise the adapter directly with a Cursor payload
echo '{"hook_event_name":"sessionStart","session_id":"x"}' \
  | node plugins/doc-detective/hooks/scripts/cursor-hook-adapter.js session-start-check-install.sh
```

When verifying inside a real `cursor-agent` session, capture the actual stdin JSON Cursor
sends for `afterFileEdit` and `preToolUse` to confirm the adapter's field mapping and to
decide whether to add a pre-write `preToolUse` block for the anti-pattern guard.
