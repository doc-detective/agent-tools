| round | change (one line) | test complete | test placement | train complete | comment only | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.937 | 0.937 | 0.882 | 0.991 | 34 | $11.21 | $11.21 |
| 1 (reverted) | Check the injected doc with a dry run | 0.952 | 0.951 | 0.902 | 0.983 | 35 | $12.54 | $23.75 |

The baseline runs `/doc-detective-inline` as it stands after the rename, on 38 cases at 3 reps. It scores high, with `complete` at 0.912 across all runs. Spec-given cases reach 0.97, and cases where the session writes the tests first reach 0.83. Sessions almost never edit the doc's prose: `comment_only` failed once, on a reStructuredText step comment indented into a code block. reStructuredText is the weakest format (`complete` 0.58), then AsciiDoc (0.83). HTML and DITA scored 1.00.

The most common failure is an injected doc that holds a step Doc Detective rejects, so its dry run detects nothing. That happened in 4 of the 10 failing runs, all on generated tests (`adoc-gen-api-key` twice, `rst-gen-cli` twice). The skill validates a spec it builds, but never checks the doc after injection. Other failures are a step left out (`md-gen-open-record-new-tab`, `rst-spec-cli`), and one session that went to the wrong URLs. Three runs put an `httpRequest` step at line 3, before the text that names its URL, which lowers `placement` without failing `complete`.

The run cost $11.21, about half the estimate, at 34 seconds per session.

Round 1 had the session run `doc-detective --dry-run` on the doc after injecting into it. On a rejected step it fixes the field that stderr names, and on success it checks the plan against what it injected. It removed the failure it targeted: no run left a doc that Doc Detective rejects, and `detected` reached 1.000 on train and test. Held-out `complete` rose 0.937 to 0.952, but that gain (+0.016 +-0.071) is within noise, so the round was reverted. Train `complete` rose 0.882 to 0.902 (+0.020 +-0.104). One train run reworded a line of the doc, and `comment_only` fell to 0.961 on train.

The noise floor on test is larger than the room left to climb. Held-out `complete` was 0.937, so a perfect skill gains 0.063, against a paired CI of about +-0.07. Remaining failures are mostly systematic, the same in every run. All three `rst-spec-cli` runs leave out 2 of its 3 steps, and all three `md-gen-open-record-new-tab` runs leave out a "draft note" step. Five runs place an `httpRequest` step before the text that names its URL, because the placement rules give `httpRequest` no match value. Sessions took 35 seconds per case, with 0.7 more tool calls.
