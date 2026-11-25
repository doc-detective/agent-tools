# Test eval cases

Each case in `cases/<id>/` is a small docs repo with one planted defect or condition. The
session gets `/doc-detective:doc-detective-test <target> --fix` and should run the tests,
name the cause of each failure, fix what belongs to the test, and leave everything else
alone. The pages and API are Doc Detective's test servers (`http://localhost:8092` and
`http://localhost:8093`). Ports 8095 and 8096 stand in for services that aren't running.

| File | Purpose |
| --- | --- |
| `workspace/` | The repo the session starts in, as one git commit. Without its own `.doc-detective.json`, it gets [doc-detective.config.json](doc-detective.config.json): headless Chrome, `detectSteps: false`. |
| `expected.json` | The outcome the grade checks (below). |
| `reference.md` | A final report that meets the case's `cause` rubric. |
| `reference/` | The files a right session changes, as it leaves them, at their workspace paths. Absent when nothing should change. |

Text files may use `__OTHER_PLATFORM__` (`linux`, `mac`, or `windows`) and
`__OTHER_PLATFORM_NAME__`, filled with a platform the host isn't, so a `runOn` skips by
design on every machine.

## `expected.json` format

```json
{
  "kind": "test_wrong",
  "target": "docs/preview-messages.md",
  "hard": "why the case is hard",
  "editable": ["docs/preview-messages.md"],
  "fix": ["preview-messages"],
  "after": { "preview-messages": "PASS" },
  "down": ["http://localhost:8095"],
  "must_contain": ["Object click landed", ["either this", "or this"]],
  "must_not_contain": ["Object clik landed"],
  "must_mention": ["Reveal by text"],
  "cause": "rubric for the judge",
  "wrong_report": "a report with the wrong cause",
  "wrong": [
    { "why": "what the bad outcome does", "fails": "right_file",
      "replace": [{ "file": "docs/x.md", "from": "old", "to": "new" }],
      "write": { "tests/x.spec.json": { "tests": [] } } }
  ]
}
```

- `kind`: one of these.
  - `doc_outdated`: the app changed, and the doc and test agree with each other, not the page.
  - `test_wrong`: the doc is right and the test isn't.
  - `invalid`: a field fails validation, so nothing runs. Under `--fix` the session fixes the field and reruns, by maintainer decision. The skill currently says to report and stop.
  - `env`: a service is down.
  - `skip`: a `runOn` for another platform.
  - `pass`: everything passes.
  - `two`: two failures with different causes.
- `target`: the doc or spec the prompt names.
- `editable`: the files the session may change. On `doc_outdated`, `env`, `skip`, and `pass` cases it's empty, and any change fails `no_harm` too. In a Markdown file, only the test comments may change; edited prose fails `right_file`.
- `fix`: the tests that must pass on the grader's rerun.
- `after`: every test's result on the rerun, by `testId`. Tests not in `fix` must keep theirs. In a spec target they must also stay as written.
- `down`: URLs that must not answer. If one does, the case stops with an error before the session starts.
- `must_contain` and `must_not_contain`: text the target's tests must still hold, or must no longer hold, after the session. Matching ignores whitespace and looks only at the test comments of a Markdown target. An array entry matches when any of its strings does. They catch a fix that passes by deleting the check or by bending the request to match a typo.
- `must_mention`: strings the final report must contain (case-insensitive) before the judge is asked. An array entry matches any of its strings.
- `cause`: the judge's rubric for the final report.
- `wrong_report` and `wrong`: bad outcomes [check-references.mjs](check-references.mjs) proves the grade rejects. A `wrong` entry applies its first-match replacements and whole-file writes to the original workspace. An object is written as JSON. The result must score `complete` 0 with its `fails` metric 0.

## Metrics

| Metric | 1 when |
| --- | --- |
| `ran` | The session ran Doc Detective's tests: a Bash call that executes it, not `--version`, `--help`, `--dry-run`, or `validate`. |
| `cause` | The final report has every `must_mention` string, and the judge (`claude-haiku-4-5`) says it meets the `cause` rubric. |
| `right_file` | Only `editable` files changed, and no Markdown prose did. |
| `fixed` | Every `fix` test passes on the rerun, `must_contain` and `must_not_contain` hold, and the session ran Doc Detective after its last edit. 1 when `fix` is empty. |
| `no_harm` | Every other test's rerun result matches `after`, and on a no-edit kind nothing changed. In a spec target, every test outside `fix` is unchanged. |
| `complete` | All five. |

The rerun runs the target as the session left it, with the case's original config and auto screenshots off.

## Cases

| id | kind | target | what makes it hard |
| --- | --- | --- | --- |
| outdated-md | doc_outdated | inline Markdown | The page's **Reveal by text** is a one-word test edit away, and the fix tool proposes it. Only the prose, which agrees with the test, says the doc is what's stale. |
| outdated-spec | doc_outdated | spec | The prompt names only the spec; the doc it tests is named in the spec's `description`. Retargeting `find` to the page's real title looks like a test fix. |
| testbug-md-typo | test_wrong | inline Markdown | Same page and error shape as outdated-md, but the prose and page agree and the step comment is misspelled. |
| testbug-spec-selector | test_wrong | spec | The doc names no selector, so the fix needs the page's real one (`#type-input`). Dropping the `type` step isn't a fix. |
| testbug-http-response | test_wrong | spec, HTTP | Fixing the expected `job` passes, and so does sending the typo in the request. Only the first tests what the doc says. |
| invalid-spec-find-text | invalid | spec | Doc Detective exits 2 before anything runs: no failing step, no screenshot, only the schema error for `find.text`. |
| invalid-md-status-code | invalid | inline Markdown, HTTP | `statusCode` for `statusCodes` in a step comment; the fix must leave the prose alone. |
| env-md-server-down | env | inline Markdown | The first step can't connect, so there's no page to compare. The README says the app runs on :8095 and must be started. |
| env-http-api-down | env | spec, HTTP | The :8093 API answers the same path, so moving the spec there turns it green. The README says :8096 is right. |
| skip-md-other-platform | skip | inline Markdown | A SKIPPED test beside a PASS, under `--fix`. Dropping the `runOn` makes it run and pass here. |
| skip-spec-all | skip | spec | Every test skips, so Doc Detective exits 2, which reads like an error. |
| pass-md-form | pass | inline Markdown | Nothing to do; under `--fix`, any tidy-up is harm. |
| pass-http | pass | spec, HTTP | Same, for API tests. |
| two-md-typo-and-outdated | two | inline Markdown | Two `Couldn't find ...` failures in one file: a test typo to fix, and a stale doc whose test must stay. |
| two-spec-selector-and-env | two | spec, HTTP | A wrong selector to fix, and a service that's down to report, in one spec. |

By kind: 2 each, 3 `test_wrong`. By target: 7 inline Markdown, 8 spec; 5 with HTTP steps.
