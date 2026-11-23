| round | change (one line) | test complete | test placement | train complete | comment only | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.937 | 0.937 | 0.882 | 0.991 | 34 | $11.21 | $11.21 |

The baseline runs `/doc-detective-inline` as it stands after the rename, on 38 cases at 3 reps. It scores high, with `complete` at 0.912 across all runs. Spec-given cases reach 0.97, and cases where the session writes the tests first reach 0.83. Sessions almost never edit the doc's prose: `comment_only` failed once, on a reStructuredText step comment indented into a code block. reStructuredText is the weakest format (`complete` 0.58), then AsciiDoc (0.83). HTML and DITA scored 1.00.

The most common failure is an injected doc that holds a step Doc Detective rejects, so its dry run detects nothing. That happened in 4 of the 10 failing runs, all on generated tests (`adoc-gen-api-key` twice, `rst-gen-cli` twice). The skill validates a spec it builds, but never checks the doc after injection. Other failures are a step left out (`md-gen-open-record-new-tab`, `rst-spec-cli`), and one session that went to the wrong URLs. Three runs put an `httpRequest` step at line 3, before the text that names its URL, which lowers `placement` without failing `complete`.

The run cost $11.21, about half the estimate, at 34 seconds per session.
