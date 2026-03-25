---
name: doc-detective-project-bootstrap
description: Initialize Doc Detective in a repository by detecting documentation, generating minimal config, creating tests for procedures, and iteratively running/fixing them. Use when (1) setting up Doc Detective in a new project, (2) user asks to "init" or "bootstrap" doc testing, (3) creating initial test coverage for existing documentation, or (4) onboarding a project to Doc Detective workflows.
metadata:
  version: '1.2.0'
  organization: Doc Detective
  date: March 2026
  abstract: Initialize Doc Detective in a repository by detecting documentation, generating minimal configuration, creating tests for identified procedures, and iteratively running and fixing tests with confidence-based suggestions. Supports interactive and CI modes.
  references: https://doc-detective.com, https://github.com/doc-detective/doc-detective, https://github.com/doc-detective/doc-detective-common
  user-invocable: 'false'
user-invocable: false
---

# Project Bootstrap

Bootstrap Doc Detective in a repository: detect docs, generate minimal config, create tests, run them, fix failures, and inject passing tests into source files.

## When to Use

Use when the user wants to set up Doc Detective, mentions "init", "bootstrap", or "get started with Doc Detective", or asks to create initial test coverage for documentation.

## Options

| Option | Default | Description |
|---|---|---|
| `--ci` | false | No prompts; use sensible defaults |
| `--dry-run` | false | Print planned changes without applying |
| `--fix-threshold <0-100>` | 80 | Ask user when fix confidence is below this value |
| `--auto-fix` | false | Apply all fixes regardless of confidence |
| `--skip-inject` | false | Skip Phase 6 injection |
| `--inject-all` | false | Inject without per-file confirmation |

## Entry Criteria

Confirm all of the following before starting. If any item is unavailable or non-discoverable, stop and ask the user to provide it.

| Criteria | How to find it |
|---|---|
| Repository root is accessible | Check working directory — ask user if unclear |
| Documentation files exist | Search for `**/*.md`, `**/*.mdx`, `**/*.adoc`, `**/*.rst`, `**/*.html`, `**/*.dita` — ask user if none found |
| Existing config (if present) is readable | Check for `.doc-detective.json` / `doc-detective.config.js` — ask user if file exists but can't be parsed |

## Exit Criteria

Before completing:

1. [ ] Documentation files detected and reported
2. [ ] Config created or merged and confirmed
3. [ ] Test specs generated, validated, and executed (unless `--dry-run`)
4. [ ] Fix loop completed or skipped; unresolved failures reported as "needs manual review"
5. [ ] Passing tests injected into source files (unless `--skip-inject` or `--ci` without `--inject-all`)
6. [ ] GitHub Action workflow offered/installed (if GitHub repo)

## Workflow

**Phases run in order. Do NOT advance to the next phase if the current phase fails.**

1. Detect → 2. Configure → 3. Generate Tests → 4. Execute → 5. Fix Loop → 6. Inject → 7. GitHub Action

### Phase 1: Detect Documentation

1. Search for documentation files matching: `**/*.md`, `**/*.mdx`, `**/*.adoc`, `**/*.rst`, `**/*.html`, `**/*.dita`
2. If no files found, stop and ask the user where documentation is located.
3. Check for existing config: `.doc-detective.json`, `doc-detective.config.js`
4. Identify procedure-heavy files: flag any file containing 3 or more numbered steps or sequential bullet points with action verbs (navigate, click, enter, verify, type, select).
5. Report file counts, key directories, and identified procedure-heavy files to the user.

### Phase 2: Configure

Generate `.doc-detective.json` following the "smallest reasonable config" principle.

If no config exists, create silently with minimal defaults. If a config exists: read it, merge new fields, show a diff, and prompt the user to confirm. If the user rejects the merge, stop and report — do not proceed.

```json
{ "input": ["docs/**/*.md"], "output": ".doc-detective/results" }
```

### Phase 3: Generate Tests

For each procedure-heavy file identified in Phase 1:

1. Invoke the `doc-testing` skill to generate a test spec: use the file as input, write output to `.doc-detective/doc-detective-tests/<name>-spec.json` where `<name>` is the source filename lowercased with non-alphanumeric characters replaced by hyphens.
2. Track the source file for each test (`_sourceFile` field) to support Phase 6 injection.
3. Validate each spec before proceeding. If a spec cannot be fixed, skip it and report it to the user.

### Phase 4: Execute Tests

Run all generated specs (try global CLI, then Docker, then npx — same fallback chain as the `doc-testing` skill):

```bash
doc-detective --input .doc-detective/doc-detective-tests/ --output .doc-detective/results/
```

If no runner is available, stop and inform the user. After execution, collect all failing tests from `testResults-<timestamp>.json`.

### Phase 5: Fix Loop

Skip this phase if no tests failed. For each failing test, repeat up to 3 times:

1. Read the step's `resultDescription` to identify the failure.
2. Propose a fix and assign a confidence score: **High (80–100)** — exact match found; **Medium (50–79)** — probable fix; **Low (0–49)** — uncertain.
3. Apply: if ≥ threshold apply automatically; if < threshold show fix, ask user to apply/skip/edit; if < 50% always ask regardless of threshold.
4. Re-run the test. If it passes, move to the next failing test.
5. After 3 failed attempts, mark the test as "needs manual review" and continue.

Report all "needs manual review" tests before completing.

### Phase 6: Inject Tests into Source Files

Skip this phase if `--skip-inject` is set, or if `--ci` is set without `--inject-all`.

For each source file with passing tests:

1. Preview the injection using the `inline-test-injection` skill (no `--apply` flag).
2. Show the preview and ask the user to confirm before applying.
3. Apply confirmed injections using the skill's `--apply` mode.

The injection tool selects the correct comment format automatically.

### Phase 7: Install GitHub Action

**Condition:** Only run if the project is an initialized GitHub repository (`.git` exists as a file or directory, and a remote URL references `github.com`). Skip this phase silently otherwise.

1. If not in `--ci` mode, ask the user if they want to set up the Doc Detective GitHub Action for CI. If the user declines, skip this phase.
2. If in `--ci` mode, default to yes — proceed without prompting.
3. Invoke `/doc-detective-install-github-action` with matching flags:
   - Pass `--ci` if bootstrap was called with `--ci`.
   - For `--exit-on-fail`:
     - In `--ci` mode, pass `--exit-on-fail` by default.
     - In interactive mode, ask the user and pass it only if they opt in.
