# Spec-generation cases: dd-docs

Nine pages from Doc Detective's own docs with their inline tests stripped out. Source: the
[doc-detective](https://github.com/doc-detective/doc-detective) repo at commit
`c14219057fff70f96f4327a603ecf2600ce658df`. Case ids are `dd-docs-<id>`.

Each `cases-dd-docs/<id>/` holds:

- `doc.md` or `doc.mdx`: the page with every inline test marker removed (`{/* test ... */}`, `{/* step ... */}`, `<!-- test ... -->`, and the like). Nothing else changes.
- `original.md` or `original.mdx`: the page as committed. It never reaches the workspace.
- `workspace/` (when the page names files): what the page assumes is in the repo.
- `reference.spec.json`: the inline tests as a standalone v5 spec that passes from the workspace root.
- `expected.json`: the same format as the [web slice](cases.md), plus `doc_path`. Browser and HTTP entries match the URL and the text the page tells the reader to use. `runShell` and `runCode` entries match the command or code shape. They match an output string only where the page quotes it.

The runner builds the workspace the same way as for [manni](cases-manni.md): `workspace/` copied, the page at `doc_path`, `tests/.gitkeep`, one git commit. Doc Detective 5.6.0 runs the spec with [doc-detective.config.json](doc-detective.config.json) (headless Chrome, and the default `relativePathBase`, so paths resolve against the spec file). The test servers on 8092 and 8093 run for this slice, as for web.

`runcode` and `run-shell-and-code` call `python` and `bash` through `runCode`, so the machine needs both on `PATH` (Git Bash covers `bash` on Windows).

## Cases

| id | source page | expected steps | workspace | summary |
|---|---|---|---|---|
| run-shell-and-code | docs/fern/pages/docs/test-code/run-shell-and-code.mdx | 5 | none (uses the workspace's git commit) | Check an exit code and output, run Python with `runCode`, capture `git rev-parse` into a variable and reuse it. |
| runshell | docs/fern/pages/docs/actions/runShell.mdx | 5 | none | The reference examples, with a string command, `args`, `exitCodes`, and a variable round trip. |
| runcode | docs/fern/pages/docs/actions/runCode.mdx | 8 | none | Python, JavaScript, and bash examples, `args`, variables, a background server on 8088, and `closeSurface`. |
| load-variables | docs/fern/pages/docs/actions/loadVariables.mdx | 2 | `secrets.env` (`DATA_URL` points at the echo API) | Load a `.env` file, then use its values in an `httpRequest`. |
| automatic-screenshots | docs/fern/pages/docs/test-docs/automatic-screenshots.mdx | 2 | none | The page's two-page example run with automatic screenshots. |
| automatic-recording | docs/fern/pages/docs/test-docs/automatic-recording.mdx | 2 | none | The same two-page example, on the automatic-recording page. |
| doc-content | test/core-artifacts/doc-content.md | 4 | none | YAML inline tests that check two links, open the page, and find `Text Elements`. |
| find-by-image | docs/fern/pages/docs/test-docs/find-elements-by-image.mdx | 5 | `icons/save.svg` | Open the page, capture a reference image, find and click by `elementImage`, find the captured chart. |
| generate-tests-from-openapi | docs/fern/pages/docs/test-code/generate-tests-from-openapi.mdx | 7 | `reqres.openapi.json` (the description committed beside the page, with its server on the echo API) | Call `getUserById` three ways, set `Authorization` per description and per request, seed `createUser` from its example, and mock its response. |

## Pages not used

Some pages are left out because a spec written from them couldn't pass here. Their prose points at public sites, such as `reqres.in`, `example.com`, `google.com`, or `nodejs.org`. Or their hidden tests aim at fixture pages the prose never names. Pages are also left out when they need a mobile device or desktop app, or the intake form served on 8080. The same goes for pages that need a committed reference image, a headed display, or `npx doc-detective` without a pinned version. That excludes most action reference pages (`click`, `find`, `goTo`, `httpRequest`, `checkLink`, and others), the getting-started and installation pages, the tutorials, and the native-app pages.

A second pass at the same commit re-checked every page with inline tests and added only `generate-tests-from-openapi`. It dropped the rest:

- The 15 Markdown and MDX files under `test/core-artifacts/detection/includes/`: `guide.md`, `missing.md`, and the files in `_partials/`, `nested/`, `mdx/starlight/`, and `mdx/docusaurus/`. They're include-detection fixtures. With their markers removed, they hold include directives and a heading, not a procedure. `httpRequestFormat.md` has no inline tests.
- Browser pages whose prose names no page to open, so their examples can't run here: `find`, `click`, `annotate`, `swipe`, `dragAndDrop`, `closeSurface`, the CSS and XPath selector pages, `capture-screenshots-guide`, `annotate-screenshots`, `narrate-recordings`, and `video-visual-regression`. Their hidden tests open fixture pages on 8092 and use other selectors.
- Pages whose prose points at public sites: `wait`, `type`, `goTo`, `checkLink`, `httpRequest`, `runBrowserScript`, `saveCookie`, `loadCookie`, `record`, `stopRecord`, `startSurface`, `record-video-guide`, `http-and-api` (`reqres.in`), `tests/standalone`, `tests/inline`, and the Markdown, HTML, and DITA input-format pages.
- `screenshot` and `screenshot-visual-regression`: the reference image is on 8080 or S3.
- `intro`: an unpinned `npx doc-detective`, a Docker run, and a Discord link.
- `tests/overview`: a reference page, not a procedure. Its examples call scripts the page never provides, such as `./install.sh`, `./preflight.sh`, and `./flaky-check.sh`.
- `last-verified-on` and `ci/upgrade-to-v5`: they explain how to author statements and migrate, not steps to run. The only test is a `wait` beside a badge.
