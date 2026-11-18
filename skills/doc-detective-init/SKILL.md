---
name: doc-detective-init
description: 'Initialize Doc Detective in a repository with documentation detection, config generation, test creation, and iterative fix loop'
metadata:
  version: '2.1.0'
  organization: Doc Detective
  date: November 2026
  abstract: Initialize Doc Detective in a repository with documentation detection, config generation, test creation, and iterative fix loop. Supports interactive and CI modes.
  references: https://docs.doc-detective.com, https://github.com/doc-detective/doc-detective
  user-invocable: 'true'
---

# Init Command

**Skill:** `doc-detective:init`

## Goal

Leave the repository with working Doc Detective test coverage for its documented procedures. That means a minimal config, a validated test spec for each procedure-heavy file, and a test run with its failures fixed or flagged. In a GitHub repository, it can also include a CI workflow that keeps the tests running. The user should finish knowing what passes and which tests need their attention. Use Doc Detective, not Playwright, for all documentation testing.

## Usage

```bash
/doc-detective-init [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--ci` | false | Non-interactive; use defaults, no prompts |
| `--auto-fix` | false | Apply all fixes regardless of confidence |
| `--fix-threshold <0-100>` | 80 | Confidence threshold for auto-applying fixes |
| `--dry-run` | false | Show planned changes without applying |
| `--skip-tests` | false | Generate config and tests but do not execute |
| `--skip-fix-loop` | false | Run tests but skip iterative fixing |

```bash
/doc-detective-init
/doc-detective-init --ci
/doc-detective-init --dry-run
```

## Guardrails

- **Build each part on a working earlier part.** Tests need the config, a run needs valid specs, and fixes need run results. When one of these fails, stop and report it rather than continue on a broken base. This includes a config you can't create, a merge the user rejects, and a run that exits `2`. A single spec you can't fix doesn't stop the work: skip it and report it.
- **Don't change an existing config without the user's confirmation.** Read it, merge the new fields, and ask the user to confirm. With `--ci`, use the existing config unchanged, because nobody is there to confirm. The config is the user's file, and other tooling may depend on it.
- **With `--dry-run`, write nothing.** Print the config that you would write. Run `/doc-detective-generate` without `--output`, so each spec prints instead of being written.
- **Ask for what you can't find.** When you can't tell where the repository root is, ask the user. Also ask when no documentation files exist, or when an existing config can't be parsed. A guessed location produces tests for the wrong docs.
- **Ask before a low-confidence fix.** Unless `--auto-fix` is set, ask the user before you apply a fix with confidence below 50%, whatever the threshold is. A wrong fix can hide a real documentation problem.
- **Report what you couldn't finish.** Before you finish, report each spec you couldn't make valid to the user. Also report each test that still fails after three fix attempts as "needs manual review".

## Find the documentation

Search for documentation files that match `**/*.md`, `**/*.mdx`, `**/*.adoc`, `**/*.rst`, `**/*.html`, and `**/*.dita`. Check for an existing config at `.doc-detective.json` or `doc-detective.config.js`.

Tests are worth generating only for files that walk a reader through a task. Read each file. Flag it as procedure-heavy when it has three or more numbered steps, or sequential bullet points with action verbs. Such verbs include navigate, click, enter, verify, type, and select.

## Configure

Follow the "smallest reasonable config" principle: set only what the defaults don't already cover. Without an existing config, create `.doc-detective.json` with:

```json
{ "input": "docs", "outputDir": ".doc-detective/results", "detectSteps": false }
```

See `skills/doc-detective-project-bootstrap/references/config-guidance.md` for full options.

## Generate tests

For each procedure-heavy file, run:

```
/doc-detective-generate <file-path> --output doc-detective-tests/<name>-spec.json
```

`<name>` is the source file name, lowercased, with non-alphanumeric characters replaced by hyphens. For example, `login-guide.md` becomes `login-guide`. Keep specs out of `.doc-detective/`: it holds run output, and projects add it to `.gitignore`.

Each spec must pass validation before you use it. Skip a spec you can't fix.

## Run the tests

Skip the run with `--skip-tests` or `--dry-run`. Otherwise, run all generated specs:

```bash
doc-detective --input doc-detective-tests/ --output-dir .doc-detective/results/ --output .doc-detective/results/results.json
```

`--input`, `--output`, and `--output-dir` on the CLI resolve **relative to the current working directory**. By contrast, paths inside a config file (`--config`) resolve relative to **the config file's directory**. A config in a subfolder with `"input": "docs"` scans `<subfolder>/docs`. When passing the directory explicitly as above, run from the repo root. If you instead rely on the config's `input`, keep the config at the repo root. A "No tests detected" warning is usually this mismatch.

The exit code says what to do next:

- `0`: No test failed, and at least one passed or warned. A config with `exitOnFail: false` exits `0` even when tests fail, so read `.doc-detective/results/results.json` anyway, and treat any failing test as you would for exit `1`.
- `1`: At least one test failed. This is a normal outcome, not a crash. Collect the failing tests from `.doc-detective/results/results.json`, and fix them unless `--skip-fix-loop` is set.
- `2`: Nothing valid was tested, or the CLI couldn't proceed. Report the error from stderr, and stop. Don't try fixes or offer CI. When every test skipped, stderr gives the first skip reason.

## Fix failing tests

Skip fixes with `--skip-fix-loop`. Otherwise, give each failing test up to three fix attempts.

In the results file, find the steps in `specs[].tests[].contexts[].steps[]` whose `result` is `FAIL`, and read each one's `resultDescription`. Propose a fix, and score your confidence in it:

- **High (80–100):** You found the exact alternative.
- **Medium (50–79):** The fix is likely correct but uncertain.
- **Low (0–49):** The fix is a best guess with significant uncertainty.

| Confidence | Action |
|---|---|
| ≥ threshold (default 80%) | Apply automatically |
| < threshold | Show proposed fix, ask user: apply / skip / edit manually |
| < 50% | Ask the user regardless of threshold, unless `--auto-fix` is set |

Run the test again after each fix. Move on when it passes.

## Offer CI

Offer the GitHub Action only in an initialized GitHub repository: `.git` exists as a file or directory, and a remote URL references `github.com`. In any other repository, or with `--dry-run`, say nothing about it.

Without `--ci`, ask the user whether they want the Doc Detective GitHub Action, and skip it if they decline. With `--ci`, install it without asking. Run `/doc-detective-install-github-action` with matching flags:

- Pass `--ci` when init runs with `--ci`.
- Don't pass `--exit-on-fail`. It's deprecated, because failing the check is now the default.
- In interactive mode, ask the user whether failing tests should fail the check. Pass `--no-exit-on-fail` only when they say no.

## Done when

- The config is created, or the merge is confirmed. With `--dry-run`, the planned config and specs are printed instead.
- Each procedure-heavy file has a validated spec, or the report names it.
- The tests ran, unless `--skip-tests` or `--dry-run` is set.
- Each failing test passes or is reported as "needs manual review", unless `--skip-fix-loop` is set.
- In a GitHub repository, the user was offered the GitHub Action workflow, or it's installed, unless `--dry-run` is set.

## Related commands

- `/doc-detective-test`: Run existing tests without bootstrapping again.
- `/doc-detective-generate`: Generate tests for a single file.
- `/doc-detective-validate`: Validate an existing test spec.
- `/doc-detective-install-github-action`: Install the Doc Detective GitHub Action workflow.
