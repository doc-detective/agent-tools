# Doc Detective MCP server — usage guide for skills

This is shared reference material for hosts that register the Doc Detective MCP server (`https://agency.doc-detective.com/mcp`). Other skills link to it as prompt material. The tools are optional: every skill works without them.

## Tools available on the MCP server

| Tool | Purpose |
|------|---------|
| `detect_tests` | Parse documentation content into a resolved Doc Detective test plan. Wraps `doc-detective-common.detectTests`. No filesystem I/O — pass content as a string. |
| `validate_spec` | Validate a spec / config / test / step / context object against `doc-detective-common` schemas. Returns structured errors plus a normalized object with defaults applied. |
| `log_observation` | Send anonymous, agent-initiated feedback to Doc Detective for roadmap and system improvement. **Never** carries user content. |

## Tool naming across hosts

The same MCP tool can surface under different names depending on the host:

| Host | Naming convention |
|------|-------------------|
| Claude Code | `mcp__doc-detective__detect_tests`, `mcp__doc-detective__validate_spec`, `mcp__doc-detective__log_observation` |
| Gemini CLI / Qwen Code / Codex | bare names: `detect_tests`, `validate_spec`, `log_observation` |
| Cursor / OpenCode / Copilot CLI | bare names, sometimes prefixed with the server name |

When a skill says "if `validate_spec` is available," check for either the bare name or the `mcp__doc-detective__` namespaced form.

## Order of preference: CLI first

Many hosts don't register this server, so skills use Doc Detective's own CLI first, and treat these tools as an option:

| Task | First choice | When the CLI can't run |
|------|--------------|----------------------------|
| Validate a spec | `npx doc-detective@5 validate <spec-file>` (`-` reads stdin) | `validate_spec` with `schemaKey: "spec_v3"` when registered, or `node <doc-detective-test skill folder>/scripts/doc-detective-validate-test.js --stdin` |
| Validate a config | `npx doc-detective@5 validate --config <config-file>` | `validate_spec` with `schemaKey: "config_v3"` when registered |
| Detect tests in a doc file | `npx doc-detective@5 --dry-run --input <doc-file>` | `detect_tests` when registered, or read the doc |

Call `validate_spec` with `{object: <spec-or-config>, schemaKey: "spec_v3" | "config_v3", addDefaults: true}`. Call `detect_tests` with `{content: <doc>, filePath?: <path>, fileType?: <type>}`. It returns `{tests[], detectedFileType, warnings[]}`, and the spec is `{ "tests": <tests> }`. It takes content as a string, so it also works on pasted doc text, which the CLI can't detect from.

The CLI can't run when there's no `npx`, or when npm fails before Doc Detective starts, for example offline with no cached copy. Then stderr holds `npm error` lines and no Doc Detective output, and the exit code says nothing about the spec. Use the fallback. The bundled validator is `scripts/doc-detective-validate-test.js` in the doc-detective-test skill's folder, next to its `SKILL.md`. Run it from that path, not from a path relative to the project.

## `log_observation` — how and when to use it

`log_observation` is for ABSTRACT, anonymous feedback that helps Doc Detective improve. It is the only tool on the server that originates from the agent's initiative rather than fulfilling a user request.

**Use it when:**

- A spec keeps failing schema validation in a way you can't satisfy after multiple tries.
- A documentation procedure can't be expressed as a Doc Detective action.
- A user repeatedly corrects you on the same step or shape.
- A tool or workflow worked unexpectedly well and is worth amplifying (`positive_signal`).

**Never include in the `message` field:**

- Spec bodies, JSON snippets, or YAML
- File paths, URLs, selectors, or query strings
- Doc prose, code blocks from the user's project
- Credentials, secrets, environment variable values
- Personally identifying information

The `message` field is **2000 characters max** and should be a high-level abstract description (e.g., "Repeated schema rejection on a custom step shape that doesn't fit any known action; user wanted to express a polling/retry pattern."). The server enforces an allow-list on `context.*` fields and silently drops anything not on the list.

**Categories** (`category` is required):

| Category | Use |
|----------|-----|
| `spec_authoring_friction` | Hard to express what the docs describe in spec form |
| `unexpected_failure` | Something failed that should have worked |
| `tool_suggestion` | An idea for a new tool or capability |
| `docs_gap` | Doc Detective documentation didn't cover the case |
| `schema_limitation` | Schema couldn't express what was needed |
| `workflow_friction` | The skill/command flow felt awkward |
| `positive_signal` | Something worked unusually well |
| `other` | Anything else |

**Severity** (`severity` is optional, defaults to `info`): `info` | `low` | `medium` | `high`.

Send at most one observation per session unless multiple distinct events warrant it. Don't spam.

## Privacy summary

- The MCP server only receives the arguments you pass to its tools.
- The `X-DD-Client` header identifies the host (e.g., `claude-code`, `gemini-cli`) — no PII.
- `detect_tests` and `validate_spec` content is processed in-memory and not persisted beyond aggregate telemetry (no raw content).
- `log_observation` is the only path back to Doc Detective with intent-bearing content. Keep it abstract.
