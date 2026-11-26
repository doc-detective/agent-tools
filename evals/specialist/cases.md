# Specialist eval cases

Each case in `cases/<id>/` is one question a user asks the `doc-detective-specialist` agent. The session runs as that agent (`claude -p <question> --agent doc-detective:doc-detective-specialist`) in an empty folder, with only this plugin loaded. The grade reads the final answer.

The questions are hard on purpose. Each turns on an edge case that a plausible answer from general knowledge, or from Doc Detective 4 habits, gets wrong. They cover interactions between features, precedence, defaults, and v5 changes. They also cover skip and guard paths, platform and headless limits, deprecated aliases, stated limits, and features that don't exist.

| File | Purpose |
| --- | --- |
| `expected.json` | The question, the facts the answer must state, and the claims it must not make. Also the snippet it should give, and wrong answers the grader must fail. |
| `reference.md` | An answer that scores every metric 1. |

## Ground truth

Every fact comes from Doc Detective's docs on `main` at `0d003b8b`, and from its schemas where a fact turns on a field, default, or enum. Each fact's `sources` names those paths, relative to the doc-detective repo. The grader runs `doc-detective@5.6.3`, the current release. No case rests on a feature `main` added after it, such as `saveState`, `loadState`, or `totp()`. Where the docs and 5.6.3 disagree, the case follows what the release does. Every message a question quotes comes from a real 5.6.3 run.

A few facts rest on an ADR with no user-facing page behind it. They're the hosted-run capture override (ADR 01196), crop centering (ADR 01204), and recording size by steady frames (ADR 01197).

## `expected.json` format

```json
{
  "category": "error",
  "question": "What the user asks, verbatim.",
  "facts": [
    { "text": "A fact the answer must state.", "sources": ["docs/fern/pages/docs/actions/find.mdx", "src/common/src/schemas/src_schemas/find_v3.schema.json"] }
  ],
  "must_not": ["A wrong claim a confident answer makes."],
  "snippet": { "run": { "does": "that clicks \"Standard Button\"", "setup": [{ "goTo": "http://localhost:8092/" }], "require": [{ "click": ["Standard Button"] }] } },
  "wrong": [
    { "why": "a field click lacks", "fails": "snippets_valid", "replace": [{ "from": "text in reference.md", "to": "its replacement" }] },
    { "why": "accepts the false premise", "fails": "no_invention", "answer": "A whole wrong answer." }
  ]
}
```

- `category`: `syntax`, `inline`, `error`, `choose`, `concept`, `compare`, or `false_premise`.
- `snippet`: absent when no snippet is expected; `{}` when the answer should include one that isn't run; `run` when one runs. `require` lists what the run needs. Each entry maps action names to strings that must all appear in the step, and any one action satisfies the entry. The first valid snippet that meets every entry runs after `setup`, or else all the answer's steps together.
- `wrong`: realistic wrong answers. Each must score `complete` 0 and 0 on its `fails` metric.

## Metrics

- `snippets_valid`: every Doc Detective snippet in the answer validates against doc-detective-common 5.6.3 in the v3 shape. A snippet is a fenced JSON or YAML block that holds a spec, test, step, list of steps, context, or config. A fenced doc block with inline statements counts too, read with 5.6.3's `detectTests`. A step statement Doc Detective doesn't read fails it. A case with `snippet` fails when the answer has none.
- `snippets_run`: for a case with `snippet.run`, the chosen steps run with `doc-detective@5.6.3` against the test servers or the shell and pass. Otherwise 1. Only steps run, so a snippet's `runOn` doesn't apply.
- `correct`: a `claude-haiku-4-5` judge agrees the answer states every fact.
- `no_invention`: the answer's `doc-detective` commands use only flags 5.6.3 has ([cli-flags.json](cli-flags.json)), and the judge agrees it makes none of the `must_not` claims. A flag the question names doesn't count against the answer, which may quote it to refute it.
- `complete`: all four.

Known limits: DITA `<data>` statements aren't read as snippets, and the flag check uses one list for every command and ignores short flags. `act-runshell-windows-shell` runs `shell: "cmd"`, so its snippet passes only on a Windows grader. Recording steps fail now and then when other Doc Detective runs share the machine's temp folder.

## Check the grader

`node evals/specialist/check-references.mjs` runs no sessions. It checks that each reference scores every metric 1, and that each wrong answer fails its metric. It also rewrites every JSON step in the reference to the v2 shape, with an `action` field, and checks that it fails `snippets_valid`. The judge runs about 230 times, about $1.50. `NO_JUDGE=1` skips the judged checks and costs nothing.

## Cases

Train and held-out (`test`) ids are in [`.claude/hillclimb/specialist/_state.json`](../../.claude/hillclimb/specialist/_state.json).

| id | split | category | edge case | run |
| --- | --- | --- | --- | --- |
| `shot-annotate-in-recording` | train | compare | `screenshot.annotations` are composited into the PNG and never reach a recording; `annotate` draws live. | yes |
| `shot-defaults-cascade` | test | concept | `annotationDefaults` resolves key by key from test to spec to config, and an annotation's own `style` wins. No step level. | |
| `shot-redact-all-inline` | train | inline | `all: true` needs an object target; without it only the first match is blurred. | yes |
| `shot-overwrite-false-skipped` | train | error | `overwrite: "false"` with an existing file skips the step, even with `maxVariation`; drift is WARNING. | |
| `shot-size-mismatch` | train | concept | Same-scale comparison by cropping to the shared region; aspect ratios over 5% apart fail. | |
| `shot-no-highlight-type` | train | false_premise | No `highlight` annotation type and no fill style. | yes |
| `shot-annotation-target-timeout` | test | error | An annotation target waits 5000 ms; `timeout` works only on the object-form target. | yes |
| `shot-live-blur-redaction` | test | choose | An `annotate` blur is burned into screenshots in every browser and fails closed. | yes |
| `shot-crop-fixed-header` | test | false_premise | `crop` has no `scrollOffset`; the target is centered, and an element too big fails. | yes |
| `shot-hosted-autoscreenshot` | train | false_premise | Hosted runs force config-level `autoScreenshot` off; spec or test `true` still captures. | |
| `shot-autoscreenshot-optout` | test | concept | `--no-auto-screenshot` sets only the config level; `runShell` steps never get captures, failed steps do. | |
| `rec-explicit-replaces-auto` | test | concept | An explicit `record` replaces the automatic recording; an untargeted `stopRecord` doesn't stop it. | |
| `rec-no-audio-annotate` | train | false_premise | Recordings have no audio; narrate with `annotate`. | yes |
| `rec-firefox-browser-engine` | test | false_premise | `engine: "browser"` is Chrome only, and headless Firefox recording is SKIPPED. | |
| `rec-no-auto-record-flag` | test | concept | `--no-auto-record` sets only the config level. | |
| `rec-hosted-autorecord` | train | concept | Hosted runs force config-level `autoRecord` off; `record` steps are unaffected. | |
| `rec-stale-no-baselines` | train | error | A committed video without `.checkpoints/` never seeds baselines and reports stale every run. | |
| `rec-refresh-vs-verify` | train | compare | `overwrite: "true"` re-records every run; `aboveVariation` turns checkpoints on; a `verify` guard fails `stopRecord`. | |
| `rec-video-size-outputs` | test | syntax | `stopRecord` outputs `$$width` and `$$height`; a headless Chrome video is shorter than the viewport. | yes |
| `cli-output-folder` | test | error | `--output` takes a file; a folder exits 2, and a missing folder name becomes a file. | |
| `cli-plain-config-output` | train | error | Config `"output": "-"` conflicts with `--plain`; a flag `--output` beats the config. | |
| `cli-invalid-spec-skip` | test | error | Invalid specs stop the run in v5; `--no-exit-on-fail` skips them but also hides failures. | |
| `cli-test-filter` | train | syntax | `--test` takes one comma list, given once, of case-insensitive regexes that match anywhere. | |
| `cli-deprecated-pipeline` | train | compare | `runTests`, `-e`, and `--logLevel` warn; logs moved to stderr, so a v4 grep gate passes silently. | |
| `cli-env-config-merge` | test | concept | `DOC_DETECTIVE_CONFIG` beats `.env` and the project config; arrays replace. | |
| `cli-config-relative-paths` | train | concept | With `-c config/ci.json`, paths resolve against the config's folder; `relativePathBase: "cwd"` fixes it. | |
| `cli-validate-precommit` | test | choose | `validate`, not `--dry-run`; a package with no tests exits 2. | |
| `cli-empty-reporters` | test | concept | `"reporters": []` still makes a run folder while auto capture is on. | |
| `cli-false-retries-flag` | train | false_premise | No `--retries` flag; config `retries` only re-runs a dead session; use `onFail` `retry`. | yes |
| `cli-install-edge` | test | false_premise | `install browsers edge` is rejected; Edge isn't a v5 browser. | |
| `in-mdx-html-comment` | train | error | An HTML comment breaks MDX parsing, the Markdown fallback drops steps inside JSX, and the test still passes. | |
| `in-asciidoc-indented-statement` | train | inline | An indented `// (step ...)` and one without parentheses are both unread. | yes |
| `in-rst-statement-as-prose` | test | inline | A `.. step` with no blank line above is prose; detection turns its URL into a failing `checkLink`. | yes |
| `in-v5-code-sample-statements` | train | concept | v5 reads no statements inside code blocks, and JSON blocks no longer become `runCode`. | |
| `in-ignore-reset-by-test-end` | test | error | A `test end` inside an ignore block turns ignoring off. | yes |
| `in-asciidoc-testignore` | train | syntax | The AsciiDoc form is `[source,bash,testIgnore]`; other listings stay unsafe and skip. | |
| `in-detectsteps-test-override` | train | false_premise | A test's `detectSteps: true` can't override config `false`. | |
| `in-include-outside-cwd` | test | error | An include outside the working directory isn't read; a partial's test runs once per page that includes it. | |
| `in-dita-data-element` | test | compare | v5 dropped `<data name="step">`; use `<data name="doc-detective" value="step ..."/>`. | |
| `in-rst-no-badge` | test | false_premise | `badge` and `verification.write` do nothing in `.rst` files. | |
| `act-click-right-string` | train | syntax | A `click` string names the element, so `"click": "right"` looks for an element called "right". | yes |
| `act-elementtext-substring` | test | error | `elementText` matches the whole text; a substring needs `/regex/`. | yes |
| `act-http-extra-fields` | train | syntax | `response.body` checks only declared fields; `allowAdditionalFields: false` goes on `httpRequest`. | yes |
| `act-statuscodes-defaults` | test | compare | `checkLink` and `httpRequest` accept different default status codes. | yes |
| `act-retries-vs-retry` | train | compare | Config `retries` re-runs a dead session only; `onFail` `retry` re-runs a step. | yes |
| `act-if-env-var` | test | error | `if` doesn't substitute `$VAR`, so the step skips and later steps still run. | |
| `act-background-ready` | train | syntax | With `background`, `stdio` and `exitCodes` are ignored; wait with `background.waitUntil`. | yes |
| `act-runshell-windows-shell` | test | error | `runShell` uses bash on every platform, so `%OS%` isn't expanded on Windows. | yes |
| `act-browser-fallback` | train | choose | `browserFallback: auto` warns and switches; `explicit` and `off` skip. | |
| `act-hover-moveto` | test | false_premise | No `hover`; use `moveTo: true`, which defaults to `false`. | yes |
| `act-timeout-zero` | train | false_premise | `goTo` and `runShell` reject `timeout: 0`; on `find`, 0 checks once. | yes |
| `act-assert-steps-ref` | test | error | Custom assertions can't read `$$steps`; save the value with `variables`. | yes |
| `res-routing-continue-verdict` | train | false_premise | `onFail` `continue` lets later steps run, but the step and test still FAIL. | yes |
| `res-all-skipped-exit-2` | train | concept | A run where every test skipped exits 2 in v5. | |
| `res-drift-whole-text` | test | error | A string target matches the whole text; `resultCode: drift` and the hint name the near match. | yes |
| `res-v5-message-grep` | train | error | Deprecated flags still work but warn; v5 messages and streams changed, so gate on exit codes. | |
| `res-false-output-folder` | test | false_premise | No setting lets `--output` take a folder again. | |
| `res-false-ignore-unknown-keys` | test | false_premise | No option turns off unknown-key checks; move metadata into `description`. | yes |
| `res-docs-as-tests-detected` | test | concept | Detected steps follow the prose, so a prose edit the product doesn't match fails. | |
| `res-compare-playwright-webkit` | train | compare | Doc Detective drives browsers through WebDriver, and `webkit` runs only on macOS; elsewhere it falls back with WARNING. | |
