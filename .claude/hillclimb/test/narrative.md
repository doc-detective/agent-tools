| round | change (one line) | test complete | test cause | train complete | train no_harm | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.556 | 0.611 | 0.667 | 0.778 | 89 | $4.88 | $4.88 |

The baseline runs `/doc-detective-test --fix` as the skill stands at 3.1.0, on 15 cases at 3 reps. Every session ran Doc Detective (`ran` 1.000), so the failures are about what the session made of the results. The run cost $4.45 in sessions and about $0.43 in judge calls, at 89 seconds per session.

The largest failure is a stale doc. In all 12 runs of `outdated-md`, `outdated-spec`, and `two-md-typo-and-outdated`, the session edited the doc or the test until the test passed, instead of proposing the doc change. That fails `right_file` and `no_harm`, and in the two-failure case it also broke the real test fix. The skill never tells a doc problem apart from a test problem, so `--fix` reads as permission to make the test pass.

The invalid field fails where the skill says to stop. One `invalid-md-status-code` run renamed `statusCode` and passed. The other two asked before fixing it, which follows the skill's rule that exit `2` means report and stop. `invalid-spec-find-text` passed all three runs.

The remaining failures are reports. Two `env-md-server-down` runs and two `env-http-api-down` runs named the environment problem, but didn't say how the README starts the service (`npm run dev`, `docker compose up orders-api`), which the rubric asks for. One `skip-spec-all` run suggested adding a platform to `runOn`. One `two-spec-selector-and-env` run fixed the selector but never reran after its last edit.

Pass, test-wrong, and skip-by-platform cases scored 1.000. One run wrote `results.json` to the workspace, and `right_file` counted it as a stray file. That run failed `fixed` anyway, so it changed no `complete` score, but the grader should ignore Doc Detective's own results files.
