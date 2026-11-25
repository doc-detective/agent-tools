| round | change (one line) | test complete | test report | train complete | train no_harm | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.079 | 0.095 | 0.303 | 1.000 | 23 | $8.16 | $8.16 |

The baseline runs `/doc-detective-install-github-action` as the skill stands at 3.2.0, on 32 cases at 3 reps. All 96 sessions finished, at 23 seconds each. Sessions cost $7.79 and the judge about $0.37.

Every session wrote a valid workflow where one was due (`workflow` 1.000), and `no_harm` held in all but one run. The skill gets the file right and the hand-off wrong.

The report is the largest failure by far. It failed in 80 of 96 runs. In 77 of them the judge's only complaint is the same one: the report never tells the user that the workflow takes effect once the file is committed and pushed. The skill never says to. The other three are `secret-env` reports that don't name `API_KEY`. Only the cases with no workflow to hand off (`confirm-first`, `gitlab-decline`) and two trigger cases passed every run.

`fit` failed in 13 runs, in five cases where the skill gives no guidance. `dev-server` and `build-then-serve` never start the app before the action. `ios-macos` runs on `ubuntu-latest`. `no-config-documentation-dir` tests the repo root, not `documentation/`. `secret-env` doesn't pass `API_KEY` to the action. Every other `fit` check passed: triggers, branches, cron, path filters, permissions, pins, and inputs.

One `run-locally-route` run changed a file when the request was only to run tests locally.
