# Doc Detective for Cursor

Doc Detective ships as a [Cursor plugin](https://cursor.com/docs/plugins) (Cursor 2.5+).
This document covers what the plugin bundles, how the Cursor-specific pieces work, and
how to test it locally.

## Install

From Cursor's Agent chat:

```text
/add-plugin doc-detective
```

Or install from [cursor.com/marketplace](https://cursor.com/marketplace) with **Add to Cursor**.

### Local testing (before publishing)

Cursor loads unpacked plugins from `~/.cursor/plugins/local/`:

```bash
git clone https://github.com/doc-detective/agent-tools.git
cp -r agent-tools/plugins/doc-detective ~/.cursor/plugins/local/doc-detective
# restart Cursor
```

You can also drive it headlessly with the [Cursor CLI](https://cursor.com/docs/cli):

```bash
curl https://cursor.com/install -fsSL | bash   # installs `cursor-agent`
cursor-agent
```

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
