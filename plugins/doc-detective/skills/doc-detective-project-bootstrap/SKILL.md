---
name: doc-detective-project-bootstrap
description: 'Detailed workflow behind doc-detective-init: detect docs, write a minimal config, generate tests, and run and fix them. For a direct user request to set up Doc Detective, doc-detective-init is the entry point.'
metadata:
  version: '2.1.3'
  organization: Doc Detective
  date: November 2026
  abstract: Initialize Doc Detective in a repository by detecting documentation, generating minimal configuration, creating tests for identified procedures, and iteratively running and fixing tests with confidence-based suggestions. Supports interactive and CI modes.
  references: https://docs.doc-detective.com, https://github.com/doc-detective/doc-detective, https://github.com/doc-detective/doc-detective-common
  user-invocable: 'false'
user-invocable: false
---

# Project Bootstrap

## Goal

Take a repository from no Doc Detective setup to working test coverage of its documented procedures. That means a minimal config, a validated spec for each procedure-heavy file, and a test run with its failures fixed or flagged. It also means passing tests injected into the docs they test, and, in a GitHub repository, an offer of CI. The user should finish knowing what the docs cover, what passes, and what needs their attention.

Use this skill when the user wants to set up Doc Detective or asks for initial test coverage of their documentation. It also applies when they mention "init", "bootstrap", or "get started with Doc Detective".

## Options

| Option | Default | Description |
|---|---|---|
| `--ci` | false | No prompts; use sensible defaults |
| `--dry-run` | false | Print planned changes without applying |
| `--fix-threshold <0-100>` | 80 | Ask user when fix confidence is below this value |
| `--auto-fix` | false | Apply all fixes regardless of confidence |
| `--skip-inject` | false | Skip injecting tests into source files |
| `--inject-all` | false | Inject without per-file confirmation |

## Guardrails

- **Build each part on a working earlier part.** Tests need the config, a run needs valid specs, fixes need run results, and injection needs passing tests. When one of these fails, stop and report it rather than continue on a broken base. This includes a merge the user rejects and a run that exits `2`. A single spec you can't fix doesn't stop the work: skip it and report it.
- **Don't change an existing config without the user's confirmation.** Read it, merge the new fields, show the diff, and ask the user to confirm. The config is the user's file, and other tooling may depend on it.
- **Don't edit documentation source without confirmation.** Preview each file's injection and get the user's confirmation before you apply it. `--inject-all` is that confirmation for every file. With `--ci` and no `--inject-all`, don't inject, because nobody is there to confirm.
- **With `--dry-run`, write nothing.** Print the changes you would make.
- **Ask for what you can't find.** When you can't tell where the repository root is, ask the user. Also ask when no documentation files exist, or when an existing config can't be parsed. A guessed location produces tests for the wrong docs.
- **Ask before a low-confidence fix.** Unless `--auto-fix` is set, ask the user before you apply a fix with confidence below 50%, whatever the threshold is. A wrong fix can hide a real documentation problem.
- **Report what you couldn't finish.** Before you finish, report each spec you couldn't make valid. Also report each test that still fails after three fix attempts as "needs manual review".

## Find the documentation

Search for documentation files that match `**/*.md`, `**/*.mdx`, `**/*.adoc`, `**/*.rst`, `**/*.html`, and `**/*.dita`. Check for an existing config at `.doc-detective.json`, `.doc-detective.yaml`, or `.doc-detective.yml`. See [references/doc-patterns.md](references/doc-patterns.md) for detection patterns.

Tests are worth generating only for files that walk a reader through a task. Flag a file as procedure-heavy when it has three or more numbered steps, or sequential bullet points with action verbs. Such verbs include navigate, click, enter, verify, type, and select. See [references/procedure-heuristics.md](references/procedure-heuristics.md) for more signals.

Report the file counts, the key directories, and the procedure-heavy files to the user.

## Configure

Follow the "smallest reasonable config" principle: set only what the defaults don't already cover.

When no config exists, create `.doc-detective.json` without asking:

```json
{ "input": "docs", "outputDir": ".doc-detective/results", "detectSteps": false }
```

See [references/config-guidance.md](references/config-guidance.md) for options and merge rules.

## Generate tests

For each procedure-heavy file, use the `doc-testing` skill to generate a spec with that file as input. Write the spec to `doc-detective-tests/<name>-spec.json`. `<name>` is the source file name, lowercased, with non-alphanumeric characters replaced by hyphens. Keep specs out of `.doc-detective/`: it holds run output, and projects add it to `.gitignore`.

Keep a list of which source file each spec came from, so you know where to inject it. Don't add it to the spec, because the test schema rejects unknown fields. Validate each spec before you use it. Skip a spec you can't fix.

## Run the tests

Try the global CLI, then Docker, then npx, as the `doc-testing` skill does. When no runner is available, tell the user.

```bash
doc-detective --input doc-detective-tests/ --output-dir .doc-detective/results/ --output .doc-detective/results/results.json
```

The exit code says what to do next:

- `0`: No test failed. A config with `exitOnFail: false` exits `0` even when tests fail, so read the results file anyway.
- `1`: At least one test failed. This is a normal outcome, not a crash. Collect the failing tests from `.doc-detective/results/results.json`, and fix them.
- `2`: Nothing valid was tested, or the CLI couldn't proceed. Report the error from stderr, and stop. Don't try fixes, inject, or offer CI.

## Fix failing tests

Give each failing test up to three fix attempts. In the results file, find the steps in `specs[].tests[].contexts[].steps[]` whose `result` is `FAIL`, and read each one's `resultDescription`. Propose a fix, and score your confidence in it:

- **High (80–100):** You found an exact match.
- **Medium (50–79):** The fix is probable.
- **Low (0–49):** The fix is uncertain.

With `--auto-fix`, apply the fix. Otherwise, apply it when its confidence is at or above the threshold and at least 50. In every other case, show the fix and ask the user to apply it, skip it, or edit it by hand. Run the test again after each fix, and move on when it passes.

## Inject passing tests

Skip injection with `--skip-inject`, or with `--ci` and no `--inject-all`. Otherwise, for each source file with passing tests, preview the injection with the `inline-test-injection` skill without `--apply`. With `--inject-all`, apply each previewed injection with `--apply`. Otherwise, apply it after the user confirms. The injection tool selects the comment format for each file type.

## Offer CI

Offer the GitHub Action only in an initialized GitHub repository: `.git` exists as a file or directory, and a remote URL references `github.com`. In any other repository, or with `--dry-run`, say nothing about it.

Without `--ci`, ask the user whether they want the Doc Detective GitHub Action, and skip it if they decline. With `--ci`, install it without asking. Run `/doc-detective-install-github-action` with matching flags:

- Pass `--ci` when bootstrap runs with `--ci`.
- Don't pass `--exit-on-fail`. It's deprecated, because failing the check is now the default.
- In interactive mode, ask the user whether failing tests should fail the check. Pass `--no-exit-on-fail` only when they say no.

## Done when

- The user has the list of documentation files and procedure-heavy files.
- The config is created, or the merge is confirmed. With `--dry-run`, the planned changes are printed instead.
- The specs are generated, validated, and run, unless `--dry-run` is set.
- Each failing test passes or is reported as "needs manual review".
- Passing tests are in their source files, unless `--skip-inject` is set, or `--ci` is set without `--inject-all`.
- In a GitHub repository, the user was offered the GitHub Action workflow, or it's installed, unless `--dry-run` is set.
