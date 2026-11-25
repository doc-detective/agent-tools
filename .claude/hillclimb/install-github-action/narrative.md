| round | change (one line) | test complete | test report | train complete | train no_harm | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.079 | 0.095 | 0.303 | 1.000 | 23 | $8.16 | $8.16 |
| 1 (kept) | Tell the user to commit and push, and start a local server before the action | 0.921 | 0.968 | 0.970 | 1.000 | 25 | $9.02 | $17.18 |

The baseline runs `/doc-detective-install-github-action` as the skill stands at 3.2.0, on 32 cases at 3 reps. All 96 sessions finished, at 23 seconds each. Sessions cost $7.79 and the judge about $0.37.

Every session wrote a valid workflow where one was due (`workflow` 1.000), and `no_harm` held in all but one run. The skill gets the file right and the hand-off wrong.

The report is the largest failure by far. It failed in 80 of 96 runs. In 77 of them the judge's only complaint is the same one: the report never tells the user that the workflow takes effect once the file is committed and pushed. The skill never says to. The other three are `secret-env` reports that don't name `API_KEY`. Only the cases with no workflow to hand off (`confirm-first`, `gitlab-decline`) and two trigger cases passed every run.

`fit` failed in 13 runs, in five cases where the skill gives no guidance. `dev-server` and `build-then-serve` never start the app before the action. `ios-macos` runs on `ubuntu-latest`. `no-config-documentation-dir` tests the repo root, not `documentation/`. `secret-env` doesn't pass `API_KEY` to the action. Every other `fit` check passed: triggers, branches, cron, path filters, permissions, pins, and inputs.

One `run-locally-route` run changed a file when the request was only to run tests locally.

Round 1 targeted the two kinds of train failure. In all 23 failing train reports, the judge's complaint was the missing commit-and-push step. The one train `fit` failure was `dev-server`, where no step started the app. The skill's report now opens with "Commit the workflow file and push it to GitHub." When the tests open a `localhost` URL, the skill now finds how the project serves it. It installs dependencies, starts the server in the background, and waits for the URL before the action. A new example shows those steps.

Held-out `complete` rose 0.079 to 0.921 (+0.841 ±0.154), clear of the noise, so round 1 is kept. Train rose 0.303 to 0.970. `workflow` stayed at 1.000 on both splits and `no_harm` didn't move. Held-out `report` went 0.095 to 0.968, and held-out `fit` 0.825 to 0.937. The server rule carried over to `build-then-serve`, which builds before it serves, and `ios-macos` now passes too. Sessions cost $8.48 and the judge $0.54.

Five runs still fail. On train, one `dev-server` report didn't say the workflow runs `npm run dev`. On the held-out side, `no-config-documentation-dir` still tests the repo root in all three runs, one `secret-env` run doesn't pass `API_KEY` to the action, and one `run-locally-route` run fails `no_harm` for a `results.json` that Doc Detective wrote. That last one is the grader's, not the skill's: the grader should ignore Doc Detective's own results files, as the test eval's does.
