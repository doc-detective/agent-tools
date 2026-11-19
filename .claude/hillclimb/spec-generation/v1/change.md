# v1: CLI first, MCP optional

Skills prefer the Doc Detective CLI (`validate`, `--dry-run`) over the optional hosted MCP tools.

## Why

The plugin's MCP server (agency.doc-detective.com) isn't loaded in the eval or in many users' setups. The generate and validate skills told the agent to call `detect_tests` and `validate_spec` first. Without them, the agent fell back to the bundled validator script, which can lag the engine, and then ran `npx doc-detective@5 validate` as a second check. The engine's own CLI is available wherever `npx` is, and it checks a spec the way a run reads it.

## What changed

- `src/skills/doc-detective-generate/SKILL.md`
  - Get a test plan: run `npx doc-detective@5 --dry-run --input <doc-file>` first, in place of `detect_tests`. Describes the plan shape as observed in 5.6.0 (`{resolvedTestsId, config, specs[{tests[{testId, contexts[{steps}]}]}]}`), how to turn it into `{ "tests": [...] }` (steps from `contexts[0].steps`, drop `location`, split by procedure, name `testId`), that detection reads markup (a bold term can yield both `click` and `find`, a link both `goTo` and `checkLink`), and that no detectable content prints `No tests found, so there's no test plan to print.` and exits `2`. `detect_tests` stays as the option for pasted text or no `npx`, when registered.
  - Validate: `npx doc-detective@5 validate <spec-file>` (or `-` for stdin) is the primary check, with exit codes 0/1/2 and the note that a `.doc-detective.*` in the current directory loads on every run. The bundled script is the fallback without `npx`. `validate_spec` is an alternative when registered. Removed the "script can lag, so also run npx" double step.
  - Guardrail and Done-when: pass means `validate` exited `0`, or a fallback validator confirmed it.
- `src/skills/doc-detective-validate/SKILL.md`
  - Choose a validator: CLI first, with exit codes, `--json` shape, stdin, and the auto-loaded config caveat. Bundled script as fallback, `validate_spec` as an option when registered. Dropped the old `--dry-run` "Option 3" for pre-`validate` Doc Detective.
  - Config files: `npx doc-detective@5 validate --config <file>` schema-checks the config first. It exits `2` with `Error: Invalid config in <file>:` plus `field: reason` lines, or `Could not read/parse config file`. Otherwise the config is valid and the rest of the output is about its `input` tests. Passing a config as a positional input treats it as a test file. All verified against doc-detective 5.6.0 and `src/validate/index.ts`, `src/utils.ts`.
- `src/skills/_shared/MCP-USAGE.md`: states the tools are optional, and replaces "prefer MCP" with a CLI-first table (task, first choice, fallback without `npx`).
- doc-detective-test and doc-detective-init: unchanged. They delegate validation to `/doc-detective-validate` and never name the MCP tools.

## Cases expected to move

- `passes` and `complete` on cases where the baseline spec failed at run time though the bundled script passed it (manni-meta-ci-exit-codes, manni-meta-schemas, manni-meta-retrofit, manni-meta-new-required-field, web-08-system-health-indirect, the 0.5 cases). The engine's validator should catch the shape errors earlier.
- `tool_calls` and `turns` should drop on most cases: one validation call instead of script plus npx, and no search for absent MCP tools.
- `coverage` may rise slightly where the dry-run plan surfaces steps the agent would have missed, and may cost latency on the first `npx` fetch.
