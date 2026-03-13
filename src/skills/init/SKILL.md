---
name: init
description: 'Initialize Doc Detective in a repository with documentation detection, config generation, test creation, and iterative fix loop'
metadata:
  version: '1.1.0'
  organization: Doc Detective
  date: March 2026
  abstract: Initialize Doc Detective in a repository with documentation detection, config generation, test creation, and iterative fix loop. Supports interactive and CI modes.
  references: https://doc-detective.com, https://github.com/doc-detective/doc-detective
  user-invocable: true
---

# Init Command

**Skill:** `doc-detective:init`

Bootstrap Doc Detective in a repository: detect docs, generate config, create tests, run them, and fix failures. Do NOT use Playwright — use Doc Detective for all documentation testing.

## Usage

```
/doc-detective:init [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--ci` | false | Non-interactive; use defaults, no prompts |
| `--auto-fix` | false | Apply all fixes regardless of confidence |
| `--fix-threshold <0-100>` | 80 | Confidence threshold for auto-applying fixes |
| `--dry-run` | false | Show planned changes without applying |
| `--skip-tests` | false | Generate config and tests but do not execute |
| `--skip-fix-loop` | false | Run tests but skip iterative fixing |

```
/doc-detective:init
/doc-detective:init --ci
/doc-detective:init --dry-run
```

## Entry Criteria

Confirm all of the following before starting. If any item is unavailable or non-discoverable, stop and ask the user to provide it.

| Criteria | How to find it |
|---|---|
| Repository root is accessible | Check working directory — ask user if unclear |
| Documentation files exist | Glob for `**/*.md`, `**/*.mdx`, `**/*.adoc`, `**/*.rst`, `**/*.html`, `**/*.dita` — ask user if none found |
| Existing config (if present) is readable | Check for `.doc-detective.json` / `doc-detective.config.js` — ask user if file exists but can't be parsed |

## Exit Criteria

Before completing:

1. [ ] Config created or merged and confirmed
2. [ ] Test specs generated and validated for all identified procedures
3. [ ] Tests executed (unless `--skip-tests` or `--dry-run`)
4. [ ] Fix loop completed or skipped (unless `--skip-fix-loop`)
5. [ ] Any unresolved failures reported to user with "needs manual review" status

## Workflow

**Phases run in order. Do NOT advance to the next phase if the current phase fails.**

1. Detect → 2. Configure → 3. Generate Tests → 4. Execute → 5. Fix Loop

### Phase 1: Detect Documentation

1. Search for documentation files matching: `**/*.md`, `**/*.mdx`, `**/*.adoc`, `**/*.rst`, `**/*.html`, `**/*.dita`
2. If no files found, stop and ask the user where documentation is located.
3. Check for existing config: `.doc-detective.json`, `doc-detective.config.js`
4. Identify procedure-heavy files: read each file and flag it if it contains 3 or more numbered steps or sequential bullet points with action verbs (navigate, click, enter, verify, type, select).

### Phase 2: Configure

Generate `.doc-detective.json` following the "smallest reasonable config" principle.

| Scenario | Action |
|---|---|
| No existing config | Create with minimal defaults (see below) |
| Existing config | Read, merge new fields, prompt user to confirm (skip prompt if `--ci`) |
| `--ci` + existing config | Use existing config unchanged |

```json
{ "input": "docs", "output": ".doc-detective/results", "detectSteps": false }
```

If `--dry-run`, print the config that would be written and skip file creation. If config cannot be created or the user rejects the merge, stop and report — do not proceed. See `skills/project-bootstrap/references/config-guidance.md` for full options.

### Phase 3: Generate Tests

For each procedure-containing file identified in Phase 1:

1. Invoke `/doc-detective:generate <file-path> --output .doc-detective/tests/<name>-spec.json`, where `<name>` is the source filename lowercased with non-alphanumeric characters replaced by hyphens (e.g., `login-guide.md` → `login-guide`).
2. Confirm each spec passes validation before continuing. If a spec cannot be fixed, skip it and report it to the user.
3. If `--dry-run`, print each spec without writing to disk.

### Phase 4: Execute Tests

Run all generated specs:

```bash
doc-detective run --input .doc-detective/tests/ --output .doc-detective/results/
```

Skip this phase if `--skip-tests` or `--dry-run` is set. If the command fails to execute, stop and report the error — do not proceed to Phase 5. After execution, collect all failing tests from the results output.

### Phase 5: Fix Loop

Skip this phase if `--skip-fix-loop` is set.

For each failing test, repeat up to 3 times:

1. Read the step's `resultDescription` to identify the failure.
2. Propose a fix and assign a confidence score: **High (80–100)** — exact alternative identified; **Medium (50–79)** — likely correct but uncertain; **Low (0–49)** — best guess with significant uncertainty.
3. Apply the fix based on confidence:

| Confidence | Action |
|---|---|
| ≥ threshold (default 80%) | Apply automatically |
| < threshold | Show proposed fix, ask user: apply / skip / edit manually |
| < 50% | Always ask user regardless of threshold |

4. Re-run the test. If it passes, move to the next failing test.
5. After 3 failed attempts, mark the test as "needs manual review" and continue.

Report all "needs manual review" tests to the user before completing.

## Related Commands

- `/doc-detective:test` — Run existing tests without re-bootstrapping
- `/doc-detective:generate` — Generate tests for a single file
- `/doc-detective:validate` — Validate an existing test spec
