| round | change (one line) | test complete | test tests | train complete | train no_harm | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.667 | 0.800 | 0.767 | 0.933 | 106 | $15.29 | $15.29 |

The baseline runs `/doc-detective-init` as the skill stands at 3.2.0, on 30 cases at 3 reps. All 90 sessions finished, at 106 seconds each. Sessions cost $14.48 and the judge about $0.81.

Every session wrote a valid config (`config` 1.000), and all but one ran Doc Detective. The failures are in what the session did with the results, and in the report.

On train, three cases fail. In `stale-button`, the guide names a button the page has renamed. Two of three runs edited the doc's prose and the test until the test passed, and said so, instead of reporting the stale doc. That fails `tests`, `no_harm`, and `report`. In `ci-text`, the prompt asks for the GitHub Action in words, without `--ci`. All three runs offered the workflow and asked to confirm it instead of writing it, which fails `ci`. In `existing-inline`, two reports said both existing tests passed without naming them.

On the held-out side, `report` failed in 20 of 60 runs, `tests` and `no_harm` in 12 each, and `ci` in 3.
