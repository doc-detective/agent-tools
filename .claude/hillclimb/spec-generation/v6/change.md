# Round 6: test what the page shows

Diagnosed from round 5's failing train runs only (17 of 33 train cases below `complete`).

Six of the 16 failing train runs pass when regraded in a fresh workspace, and in one with the session's `.npm-global` prefix. manni's output is deterministic, so those are grade-time flakes, likely concurrent `npx` runs. They aren't a skill signal.

The rest, and the coverage misses on passing runs, cluster as follows:

- **The page's command is replaced.** Sessions ran `key set --dry-run` where the page runs `key set`, and validated their own schema files instead of running `meta schemas` and `meta validate -s diataxis:diataxis:1.0 -s google:okf:0.1`. A `--format github` variant was dropped.
- **`stdio` checks something else.** Steps had no `stdio`, or matched a line other than the output the page shows (`3 warnings`, `Would create site.metadata.yaml`, `1 failed`).
- **The problem isn't reproduced.** `--format github` ran on clean files, so no `::error` line printed.
- **An example spec is validated, not run.** dd-docs-automatic-recording wrote the page's example spec to a file and validated it in all three reps, so none of its `goTo` steps ran (coverage 0).
- **`../` inside a command.** Round 5's spec-relative path rule was applied to a `runShell` command (`../docs/limits.md`), which runs from the repository root.

Change: generate's SKILL.md gets a "Test what the page shows" section (the page's commands as written, `stdio` on the page's output, reproduce the problem shown, run an example spec's steps), and the command-path rule becomes its own bullet with a `../` counterexample.
