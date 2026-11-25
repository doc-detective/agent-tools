| round | change (one line) | test complete | test cause | train complete | train no_harm | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.556 | 0.611 | 0.667 | 0.778 | 89 | $4.88 | $4.88 |
| 0b | baseline, test split to 6 reps | 0.639 | 0.722 | 0.667 | 0.778 | 84 | $1.98 | $6.86 |
| 1 (6 held out) | Sort each failure by kind before `--fix` changes anything | 0.944 | 0.944 | 0.963 | 1.000 | 71 | $7.06 | $13.92 |
| 0c | baseline on 14 added held-out cases | 0.517 | 0.600 | 0.667 | 0.778 | 89 | $4.77 | $18.69 |
| 1b (kept) | Round 1 with review fixes, on 20 held-out cases | 0.967 | 0.967 | 1.000 | 1.000 | 75 | $9.82 | $28.51 |

The baseline runs `/doc-detective-test --fix` as the skill stands at 3.1.0, on 15 cases at 3 reps. Every session ran Doc Detective (`ran` 1.000), so the failures are about what the session made of the results. The run cost $4.45 in sessions and about $0.43 in judge calls, at 89 seconds per session.

The largest failure is a stale doc. In all 12 runs of `outdated-md`, `outdated-spec`, and `two-md-typo-and-outdated`, the session edited the doc or the test until the test passed, instead of proposing the doc change. That fails `right_file` and `no_harm`, and in the two-failure case it also broke the real test fix. The skill never tells a doc problem apart from a test problem, so `--fix` reads as permission to make the test pass.

The invalid field fails where the skill says to stop. One `invalid-md-status-code` run renamed `statusCode` and passed. The other two asked before fixing it, which follows the skill's rule that exit `2` means report and stop. `invalid-spec-find-text` passed all three runs.

The remaining failures are reports. Two `env-md-server-down` runs and two `env-http-api-down` runs named the environment problem, but didn't say how the README starts the service (`npm run dev`, `docker compose up orders-api`), which the rubric asks for. One `skip-spec-all` run suggested adding a platform to `runOn`. One `two-spec-selector-and-env` run fixed the selector but never reran after its last edit.

Pass, test-wrong, and skip-by-platform cases scored 1.000. One run wrote `results.json` to the workspace, and `right_file` counted it as a stray file. That run failed `fixed` anyway, so it changed no `complete` score, but the grader should ignore Doc Detective's own results files.

Round 1 targeted the stale-doc failures on train (`outdated-md`, `two-md-typo-and-outdated`), the environment report (`env-md-server-down`), and the skip report (`skip-spec-all`). The skill now has `--fix` decide where each failure belongs before it changes anything: a wrong test is fixed, a stale doc is reported with a proposed edit, an outage is reported with how to start the service, a `runOn` skip is left alone, and an invalid field is fixed and revalidated. That last rule follows the maintainer's decision for this eval, where the skill used to say stop.

One train case dropped from 3 of 3 to 0 of 3, `testbug-http-response`, but only on `cause`: every run fixed the right value and passed, and the judge failed the report for not saying what the request sends. That rubric asked for a detail beyond the cause, so it was loosened, and both arms were re-judged on that case; the baseline kept 3 of 3. The grader also stopped counting a results-named JSON as a stray file, and the runner gained `--split`.

At 6 test reps, held-out `complete` rose 0.639 to 0.944 (+0.306 +-0.331), and train 0.667 to 0.963 (+0.296 +-0.297), both just inside the noise, so the round isn't kept on its own. The gains are systematic: `outdated-spec` went 0 of 6 to 6 of 6, `invalid-md-status-code` 2 to 5 of 6, and every stale-doc and environment case on train passed all runs. `right_file` and `no_harm` reached 1.000 on both splits. `testbug-md-typo` lost one run of 6. Sessions took 13 seconds less.

Six held-out cases are too few for this rule: the interval is about +-0.33, and the baseline leaves only 0.361 to gain on test. More reps barely help, because the spread is between cases. So before round 2, the held-out set grows.

Round 1 drew review fixes before the decision. The fix loop now runs only for a test that's wrong or has an invalid field. A stale-doc edit needs confirmation even with `--auto-fix`. A value the doc doesn't state, which the response breaks, is reported rather than fixed. And the environment rule covers only the host and port the doc names. The grader was hardened at the same time: it reads only real Doc Detective runs, orders an edit and a rerun within one command, rejects an edit to a test outside `fix`, and keeps Markdown paragraph breaks in the prose check. Rechecked against the recorded traces, that changed one baseline row: `two-spec-selector-and-env` rep 0 edited and reran in one command, and now scores `complete`.

Fourteen held-out cases were then added, two of each kind, written without seeing any scores, so the held-out set is 20. Row 0c is the baseline skill on them, at 3 reps. Row 1b is round 1 with its review fixes, as variant v2, on every case at 3 reps.

Held-out `complete` rose 0.517 to 0.967 (+0.450 +-0.203), clear of the noise, so round 1 is kept. Train reached 1.000. Every stale-doc and environment case now passes all runs, including the six new ones, and `right_file` and `no_harm` are 1.000 on both splits. Two held-out runs failed, each on `cause` once: one `invalid-spec-request-data` report didn't say the response check still holds, and one `two-spec-case-and-outdated` report proposed changing the stale-doc test to pass. Sessions took 75 seconds, 14 fewer than the baseline, and cost a little less.

The climb stops here. With train at 1.000, there's no train failure left to diagnose, and the held-out failures can't steer a round without leaking the test set. Rounds 2 to 5 would need new train cases first, built the way the held-out ones were.
