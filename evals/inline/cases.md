# Inline eval cases

Each case in `cases/<id>/` is a documentation source file a user asks the plugin to put
Doc Detective tests into, as inline comments. The id reads `<format>-<kind>-<name>`.
`spec` cases hand the session a spec to inject; `gen` cases hand it only the doc, so it
writes the tests first.

| File | Purpose |
| --- | --- |
| `doc.<ext>` | The input doc. The workspace holds it at `docs/<name>.<ext>`. |
| `spec.json` or `spec.yaml` | `spec` cases: the spec to inject, at `tests/<name>.spec.<ext>`. |
| `expected.json` | `gen` cases: the steps the doc needs, in the [spec-generation format](../spec-generation/cases.md#expectedjson-format). |
| `reference.<ext>` | The doc with the tests injected by hand. It scores `complete` and full `placement`. |
| `workspace/` | Optional: files the session starts with, such as `.doc-detective.json`. The grade's dry run uses this config too. |

The prompt is `/doc-detective:doc-detective-inline [tests/<name>.spec.<ext>] docs/<name>.<ext> --apply`.

Sources: the skill's own fixtures (`src/skills/doc-detective-inline/scripts/fixtures/`),
the [spec-generation](../spec-generation/cases.md) web and [dd-docs](../spec-generation/cases-dd-docs.md)
slices (doc, `reference.spec.json` as the given spec, `expected.json` for `gen`; a dd-docs
page's original with its inline tests is the reference), and short new docs where a
format was thin.

## Cases

| id | format | kind | steps | source | what it tests |
| --- | --- | --- | --- | --- | --- |
| md-spec-sample | md | spec | 3 | skill fixture | The fixture and its expected output. |
| md-gen-sample | md | gen | 3 | skill fixture | Same doc, tests written by the session. |
| mdx-spec-sample | mdx | spec | 3 | skill fixture | `{/* */}` comments around JSX components. |
| mdx-gen-sample | mdx | gen | 3 | skill fixture | |
| html-spec-sample | html | spec | 3 | skill fixture | The script leaves the first `goTo` before the test start. |
| html-gen-sample | html | gen | 3 | skill fixture | |
| adoc-spec-sample | adoc | spec | 3 | skill fixture | Same script slip as HTML. |
| adoc-gen-sample | adoc | gen | 3 | skill fixture | |
| rst-spec-sample | rst | spec | 3 | skill fixture | Each comment its own block. |
| rst-gen-sample | rst | gen | 3 | skill fixture | |
| md-spec-with-config | md | spec | 4 | skill fixture `with-config` | hard: a `.doc-detective.json` with custom markup (`Head over to`, `Press`, `Tap on`) that the built-in verbs miss. |
| md-spec-two-procedures | md | spec | 11 in 2 tests | new doc, fixture `valid-complex.yaml` | hard: two procedures in one page from a YAML spec; the second test's URL is a prefix of the first's. |
| md-spec-existing-tests | md | spec | 4 | new doc | hard: the page already has an inline test; the new test's first URL also sits inside it. |
| mdx-spec-glob | mdx | spec | 2 in 2 tests | new doc | hard: a `runShell` glob holds `*/`, which ends an MDX comment. The reference escapes it as `*\/` in the JSON. |
| dita-spec-sign-in | dita | spec | 4 | new doc | DITA task with `<?doc-detective ?>` processing instructions. |
| dita-gen-sign-in | dita | gen | 4 | new doc | |
| html-spec-display-name | html | spec | 4 | new doc | A list with no blank lines; `type` with a selector. |
| html-gen-display-name | html | gen | 4 | new doc | |
| adoc-spec-api-key | adoc | spec | 2 | new doc | `httpRequest` steps whose URLs appear only in listing blocks; a comment there would be code. |
| adoc-gen-api-key | adoc | gen | 2 | new doc | |
| rst-spec-cli | rst | spec | 3 | new doc | `runShell` steps for commands in `code-block` directives; an indented comment would join the code. |
| rst-gen-cli | rst | gen | 3 | new doc | |
| md-spec-home-page-tour | md | spec | 8 | spec-generation web 01 | Many `find` steps on wrapped list text. |
| md-spec-profile-form | md | spec | 13 | spec-generation web 05 | Nested lists; selector steps with no text in the doc. |
| md-spec-api-create-user | md | spec | 1 | spec-generation web 13 | One `httpRequest` after a request block. |
| md-spec-resource-links | md | spec | 4 | spec-generation web 16 | `checkLink` steps. |
| md-spec-order-lookup | md | spec | 5 | spec-generation web 26 | A regex `elementText`. |
| md-spec-plan-tier | md | spec | 6 | spec-generation web 27 | hard: ambiguous placement, the labels **Second** and **Third** each appear twice. |
| md-spec-compare-records | md | spec | 11 | spec-generation web 31 | Multi-tab steps with `surface` objects. |
| md-gen-preview-notifications | md | gen | 5 | spec-generation web 03 | |
| md-gen-loading-content | md | gen | 3 | spec-generation web 09 | |
| md-gen-open-record-new-tab | md | gen | 7 | spec-generation web 10 | |
| md-gen-api-list-users | md | gen | 1 | spec-generation web 12 | |
| md-gen-saved-preferences | md | gen | 4 | spec-generation web 18 | A prerequisite section before the procedure. |
| md-spec-doc-content | md | spec | 5 | dd-docs doc-content | The original page uses YAML comments; the reference is that page. |
| mdx-spec-run-shell-and-code | mdx | spec | 5 in 4 tests | dd-docs run-shell-and-code | Four tests in one page. |
| mdx-gen-load-variables | mdx | gen | 2 | dd-docs load-variables | A `workspace/secrets.env` the page names. |
| mdx-gen-automatic-screenshots | mdx | gen | 2 | dd-docs automatic-screenshots | Both steps sit after one code block. |

By format: Markdown 18, MDX 6, HTML 4, AsciiDoc 4, reStructuredText 4, DITA 2. By kind: 22
`spec`, 16 `gen`.
