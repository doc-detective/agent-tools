| round | change (one line) | test complete | test cause | train complete | train no_harm | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.556 | 0.611 | 0.667 | 0.778 | 89 | $4.88 | $4.88 |
| 0b | baseline, test split to 6 reps | 0.639 | 0.722 | 0.667 | 0.778 | 84 | $1.98 | $6.86 |
| 1 (not kept) | Sort each failure by kind before `--fix` changes anything | 0.944 | 0.944 | 0.963 | 1.000 | 71 | $7.06 | $13.92 |

The baseline runs `/doc-detective-test --fix` as the skill stands at 3.1.0, on 15 cases at 3 reps. Every session ran Doc Detective (`ran` 1.000), so the failures are about what the session made of the results. The run cost $4.45 in sessions and about $0.43 in judge calls, at 89 seconds per session.

The largest failure is a stale doc. In all 12 runs of `outdated-md`, `outdated-spec`, and `two-md-typo-and-outdated`, the session edited the doc or the test until the test passed, instead of proposing the doc change. That fails `right_file` and `no_harm`, and in the two-failure case it also broke the real test fix. The skill never tells a doc problem apart from a test problem, so `--fix` reads as permission to make the test pass.

The invalid field fails where the skill says to stop. One `invalid-md-status-code` run renamed `statusCode` and passed. The other two asked before fixing it, which follows the skill's rule that exit `2` means report and stop. `invalid-spec-find-text` passed all three runs.

The remaining failures are reports. Two `env-md-server-down` runs and two `env-http-api-down` runs named the environment problem, but didn't say how the README starts the service (`npm run dev`, `docker compose up orders-api`), which the rubric asks for. One `skip-spec-all` run suggested adding a platform to `runOn`. One `two-spec-selector-and-env` run fixed the selector but never reran after its last edit.

Pass, test-wrong, and skip-by-platform cases scored 1.000. One run wrote `results.json` to the workspace, and `right_file` counted it as a stray file. That run failed `fixed` anyway, so it changed no `complete` score, but the grader should ignore Doc Detective's own results files.

Round 1 targeted the stale-doc failures on train (`outdated-md`, `two-md-typo-and-outdated`), the environment report (`env-md-server-down`), and the skip report (`skip-spec-all`). The skill now has `--fix` decide where each failure belongs before it changes anything: a wrong test is fixed, a stale doc is reported with a proposed edit, an outage is reported with how to start the service, a `runOn` skip is left alone, and an invalid field is fixed and revalidated. That last rule follows the maintainer's decision for this eval, where the skill used to say stop.

One train case dropped from 3 of 3 to 0 of 3, `testbug-http-response`, but only on `cause`: every run fixed the right value and passed, and the judge failed the report for not saying what the request sends. That rubric asked for a detail beyond the cause, so it was loosened, and both arms were re-judged on that case; the baseline kept 3 of 3. The grader also stopped counting a results-named JSON as a stray file, and the runner gained `--split`.

At 6 test reps, held-out `complete` rose 0.639 to 0.944 (+0.306 +-0.331), and train 0.667 to 0.963 (+0.296 +-0.297), both just inside the noise, so the round isn't kept on its own. The gains are systematic: `outdated-spec` went 0 of 6 to 6 of 6, `invalid-md-status-code` 2 to 5 of 6, and every stale-doc and environment case on train passed all runs. `right_file` and `no_harm` reached 1.000 on both splits. `testbug-md-typo` lost one run of 6. Sessions took 13 seconds less.

Six held-out cases are too few for this rule: the interval is about +-0.33, and the baseline leaves only 0.361 to gain on test. More reps barely help, because the spread is between cases. So before round 2, the held-out set grows.
