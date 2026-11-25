| round | change (one line) | test complete | test tests | train complete | train no_harm | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.667 | 0.800 | 0.767 | 0.933 | 106 | $15.29 | $15.29 |
| 1 (kept) | Report a stale doc instead of fixing its test, install CI when asked in words, name each test | 0.867 | 0.933 | 0.933 | 1.000 | 101 | $14.57 | $29.86 |

The baseline runs `/doc-detective-init` as the skill stands at 3.2.0, on 30 cases at 3 reps. All 90 sessions finished, at 106 seconds each. Sessions cost $14.48 and the judge about $0.81.

Every session wrote a valid config (`config` 1.000), and all but one ran Doc Detective. The failures are in what the session did with the results, and in the report.

On train, three cases fail. In `stale-button`, the guide names a button the page has renamed. Two of three runs edited the doc's prose and the test until the test passed, and said so, instead of reporting the stale doc. That fails `tests`, `no_harm`, and `report`. In `ci-text`, the prompt asks for the GitHub Action in words, without `--ci`. All three runs offered the workflow and asked to confirm it instead of writing it, which fails `ci`. In `existing-inline`, two reports said both existing tests passed without naming them.

On the held-out side, `report` failed in 20 of 60 runs, `tests` and `no_harm` in 12 each, and `ci` in 3.

Round 1 targeted the three train failures. The fix loop now changes only a test that doesn't match its doc. When the test follows the doc and the product moved on, it reports the stale doc and proposes the edit. When the user's request asks for the GitHub Action in words, init installs it with `--ci` instead of asking again. A new Report section has the report name each test by its ID, with its result.

Held-out `complete` rose 0.667 to 0.867 (+0.200 ±0.198), just clear of the noise, so round 1 is kept. Every held-out metric rose: `tests` 0.800 to 0.933, `no_harm` 0.800 to 0.950, `ci` 0.950 to 1.000, and `report` 0.667 to 0.867. Train rose 0.767 to 0.933, with `no_harm` and `ci` at 1.000. Sessions cost $13.91 and the judge $0.66.

Both train failures left are the grader's. One `existing-inline` session ran Doc Detective as `timeout 300 npx --no-install doc-detective …`, and `isDDRun` didn't recognize the `timeout` prefix, so `ran` failed. The detector now allows `time` and `timeout <n>` prefixes, with the session's command as a new classifier case. One `docs-dir-ui` report said a generated test failed once and passed after a fix to the test. That's accurate, but the rubric said "It doesn't claim a failure." It now rules out only a test reported as still failing. Both cases pass their grader proofs again. `isDDRun` is shared with the test eval, so the next run of either eval needs `--approve-harness`.

The climb stops here. Under the fixed grader no train failure is left to diagnose, and the held-out failures can't steer a round without leaking the test set. Further rounds need new train cases first.
