# Audit Test Coverage

Use `doc-detective audit` to find the procedure steps in a project's docs that no test step covers. Its report also gives templates for the inline statements that cover them. It detects tests the way a run does, but runs nothing: no browser starts and no step executes. Run it before you write tests, to choose what to test. Run it again after you add or inject tests, to confirm they give credit where you meant them to.

Full reference: https://docs.doc-detective.com/docs/test-docs/audit-test-coverage

## Run the Audit

```bash
npx doc-detective audit docs/ --json
```

- Pass files or folders as arguments, as for a run. Without arguments, `audit` reads `input` from the config, or the current folder.
- `audit` reads the same `input`, `fileTypes`, `detectSteps`, `allowUnsafeSteps`, and `origin` settings as a run. After you change the config, audit again.
- Read the `--json` output. It lists every item with its file, line, and state. The text report lists items only for untested procedure steps.
- Exit code `0` means `audit` printed a report, whatever the coverage. It doesn't mean the docs are covered, so read the counts. Exit `2` means bad usage, a bad config, or no files to audit.
- `audit` needs a Doc Detective release that includes the command. If `npx doc-detective --help` doesn't list `audit`, the installed release doesn't have it. Find procedures by reading the docs instead.

## Read the Report

| Field | Contents |
|---|---|
| `summary.procedureSteps` | Procedure step counts: `total`, plus one count per state, and `navigationOnly`, the items whose only steps are `goTo` or `checkLink`. |
| `summary.possibleProcedureSteps` | The same counts for numbered lists that `audit` didn't judge to be procedures. |
| `files[]` | One entry per audited file: `path` (absolute), `fileType`, `syntax`, `measured`, and `items`. |
| `files[].items[]` | Each procedure step, runnable code block, link, and image, with `kind`, `line`, and `state`. A procedure step also has `source` and `text`. |
| `guidance` | What to write, with templates for each syntax in the run. See [Act on the Report](#act-on-the-report). |

`summary` also counts code blocks, links, images, and pages.

Each item has one `state`:

| `state` | Meaning |
|---|---|
| `hasStep` | A step that runs belongs to the item. |
| `inTest` | A procedure step with no step of its own, inside a test that has a step that runs. `audit` counts it apart from `hasStep`. |
| `untested` | No step belongs to the item. |
| `ignored` | The item overlaps a `test ignore` block, or its code block is tagged `testIgnore`. |
| `skipped` | The item's only steps are unsafe and `allowUnsafeSteps` is off. |

A procedure step's `source` says how `audit` found its list:

- `explicit`: someone marked it. A DITA `<steps>` element, an MDX `<Steps>` component, a list right after a `procedure` statement, or a code block with the `procedure` class.
- `tagger`: at least a third of the list's items read as instructions.
- `possible`: any other numbered list. These items count under `possibleProcedureSteps`, not `procedureSteps`.

The untested procedure steps are the items with `kind: "procedureStep"`, `state: "untested"`, and a `source` other than `possible`. `audit` finds procedures only in numbered lists and the marked forms above, so a procedure written as bullets or prose never appears, even after a `procedure` statement. A file with `measured: false` has a format that `audit` can't search for procedures, so its procedure counts tell you nothing.

## Act on the Report

Take each file's templates from `guidance.syntaxes[file.syntax]`. Each entry has `step`, `testStart`, `testEnd`, `ignoreStart`, `ignoreEnd`, and `procedure`, and a built-in syntax also has `ignoreCodeBlock`. The payloads in the templates, `{"click": "Save"}` and `"testId": "my-test"`, are placeholders. Replace them with the action the sentence describes and a test ID that names the procedure. `audit` credits any step that runs, so a pasted placeholder counts as coverage while it checks the wrong thing.

- **Cover an untested step.** Put a step statement inside the item, on the line after the sentence it tests. A step belongs to the item it sits in, and an item runs from its marker to the next item. Or wrap the procedure in `testStart` and `testEnd` with at least one step that runs, which makes its other items `inTest`. A test that is empty, or holds only steps that check nothing, such as `wait` and `loadVariables`, gives no credit.
- **Flag a false positive.** Wrap a list that isn't a procedure, or an item the user doesn't want tested, in `ignoreStart` and `ignoreEnd`. Tag a code block you won't run with `testIgnore`, in the form `ignoreCodeBlock` shows. An ignored item no longer counts as untested, so ignoring a real procedure hides the gap.
- **Fix a false negative.** When a real procedure's items have `source: "possible"`, put the `procedure` statement directly before the list, with nothing but blank lines between them. `audit` reads list items with an English grammar tagger, so lists in other languages land in `possible`.
- **Leave `skipped` items to the user.** Their steps run only with `allowUnsafeSteps` on, which lets a run execute steps that might modify files or system state.

An entry with `custom: true` is a custom file type with its own `inlineStatements`. Its templates are bare statement text. Wrap each one in that file type's comment form, as the entry's `note` says.

Rerun `audit` after the edits and confirm that each item you worked on moved to `hasStep`, `inTest`, or `ignored`.

## Credit from Standalone Specs

A procedure step gets credit only from steps in the doc file itself. A spec in a separate file, such as `doc-detective-tests/<name>-spec.json`, credits only these items, and only when the spec is among the audit inputs:

- A code block whose `id` matches a step's `stepId`
- A link that a `goTo` or `checkLink` step targets
- An image that a `screenshot` step writes

To credit procedure steps, inject the tests into the doc files with the `doc-detective-inline` skill.
