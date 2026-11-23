# Round 5: make each step pass where the spec runs

Read from round 4's failing train runs only (33 runs regraded from their traces). Most failures were steps that were right for the doc's example but wrong for the files present when the spec runs:

- Field paths written relative to the repository root, not the spec file (`loadVariables`, `elementImage`): dd-docs-load-variables 3/3, dd-docs-find-by-image 2/3.
- `exitCodes` left at `[0]` for a command that reports a problem in the workspace (manni-meta-set-up 3/3, set-up-config, fix).
- Steps pointing at scratch files or folders the session made while writing and then removed (meta-schemas, field-location, set-up).
- `node -e` code passed through `args`, which `runShell` joins unquoted (meta-get-started).
- `jq` assumed installed, exit 127 (meta-ci-consume-results).
- Wrong arguments, exit 2, from not reading `--help` (meta-ci-consume-results, machine-authorship).

Change: a "Make each step pass where the spec runs" section in the generate skill, and the `runShell` `args` note in `references/actions.md`.
