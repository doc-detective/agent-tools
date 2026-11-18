---
name: doc-detective-inline-test-injection
description: 'Reference and script for placing Doc Detective test steps into documentation source as inline comments (Markdown, MDX, HTML, AsciiDoc, reStructuredText, XML/DITA). Used by the doc-testing and project-bootstrap workflows. For a direct user request to inject a spec, doc-detective-inject is the entry point.'
metadata:
  version: '2.1.0'
  organization: Doc Detective
  date: November 2026
  abstract: Inject Doc Detective test specifications directly into documentation files as inline comments. Supports Markdown, MDX, HTML, AsciiDoc, reStructuredText, and XML/DITA formats with automatic format detection and semantic step matching.
  references: https://docs.doc-detective.com, https://github.com/doc-detective/doc-detective
  user-invocable: 'false'
---

# Inline Test Injection

## Goal

Put the tests from a Doc Detective spec into a documentation source file as inline comments, with each step right after the content it tests. Doc Detective then finds and runs the tests when it scans the docs, and writers who edit a procedure see its test beside it. The injected file must still build, and every test must still run as the spec defines it. A misplaced step tests the wrong text, and a broken comment can break the docs build.

This skill injects specs. To run tests after injection, use `/doc-detective-test`. For documentation testing, use Doc Detective rather than Playwright.

## Guardrails

- **Preview unless `apply` is `true`.** By default, print a unified diff of the planned insertions to stdout, and leave the source file unchanged. Injection edits the user's documentation source, so they need to see it first.
- **Stop with a clear error when an input is unusable.** Don't guess a file or a format:
  - A spec that won't parse as JSON or YAML: `Error: invalid spec format in <path>: <parse error>`.
  - A missing or empty `tests` array: `Error: spec file contains no tests: <path>`.
  - A file extension that isn't in the syntax table: `Error: unsupported file type: <extension>`. An included partial is the exception. See [Injecting into shared snippets and partials](#injecting-into-shared-snippets-and-partials).
  - When the user didn't give the spec or the source file, or one can't be read, ask for it.
- **Never let `*/` into an MDX comment.** The MDX comment `{/* … */}` ends at the first `*/`. A step whose JSON contains `*/` closes the comment early and breaks the MDX or Astro build. Globs such as `**/dir/**` and some regexes contain it. There's no way to escape `*/` inside a `{/* … */}` JSX comment. Before you inject any MDX comment, scan each step's JSON for `*/`, and rewrite a payload that contains it, for example to `test/dir/**` instead of `**/dir/**`. Tell the user which payloads you rewrote, because the test no longer matches the spec exactly. This applies to a partial that an `.mdx` page includes, too. Markdown and HTML `<!-- … -->` comments aren't affected.
- **Write each reStructuredText comment as its own block.** Doc Detective reads `.. test {...}`, `.. step {...}`, `.. test end`, and `.. test ignore start` / `.. test ignore end` only when the comment starts its own block. Put a blank line before and after each one. A `..` line that continues a paragraph is prose. A multi-line payload continues on lines indented under the `.. step` line. Directives (`.. note::`), targets (`.. _name:`), footnotes (`.. [1]`), and substitutions (`.. |name|`) aren't test comments.
- **Keep the spec's order, and mark what you couldn't match.** Step comments follow the order of the spec's steps. Put `<!-- TODO: verify step placement -->` on the line after each step that no rule matched, so a person checks it.

## Comment syntax

The file extension sets the comment syntax:

| File Type | Extensions | Comment Syntax |
|-----------|------------|----------------|
| Markdown | `.md`, `.markdown` | `<!-- step {...} -->` |
| MDX | `.mdx` | `{/* step {...} */}` |
| HTML | `.html`, `.htm` | `<!-- step {...} -->` |
| XML/DITA | `.xml`, `.dita`, `.ditamap` | `<?doc-detective step {...} ?>` |
| AsciiDoc | `.adoc`, `.asciidoc`, `.asc` | `// (step {...})` |
| reStructuredText | `.rst` | `.. step {...}` |

Serialize each step in the file's comment wrapper, in the format the `syntax` parameter sets:

- **json** (default): `<!-- step {"goTo":"https://duckduckgo.com"} -->`
- **yaml**: `<!-- step` / `goTo: https://duckduckgo.com` / `-->`
- **xml**: `<?doc-detective step goTo="https://duckduckgo.com" ?>`

Insert `<!-- test {"testId":"..."} -->` at line 1 for the first test, or after the previous `<!-- test end -->` for later tests. Insert `<!-- test end -->` after each test's last step comment.

## Placement

Each test is placed on its own, so the search starts again at line 1 for each test. Each test has a `testId` and a `steps` array.

A step's **match value** is the text to look for:
- A string step value, such as `goTo: "https://..."` or `click: "Submit"`, is the match value.
- For an object with a `keys` field, such as `type: {keys: "text"}`, the `keys` value is the match value.
- A number or an object without `keys`, such as `wait: 2000` or `httpRequest: {...}`, has no match value. Only the pattern rule applies.

Search from the line after the previous step's comment, or from line 1 for the first step. Use the first rule that finds a line:

1. **Exact match:** A line contains the match value verbatim.
2. **Contains match:** A line contains the match value as a substring.
3. **Pattern match:** A line matches the action's content pattern in the table below.
4. **No match:** Use the line after the previous step's comment, or line 1 for the first step. Mark the step with the TODO comment.

The rules run from most to least specific, so an earlier rule overrides a later one. Insert the step comment right after the line the rule selects. When several lines satisfy a rule, select the earliest one at or after the previous insertion point. Keep the matched line's indentation.

| Action | Matches Line Containing |
|--------|------------------------|
| `goTo` | A hyperlink preceded by one of: `go to`, `navigate`, `open`, `visit` |
| `checkLink` | Any hyperlink (`[text](url)` or bare URL) |
| `click` | Bold text (`**...**` or `__...__`) preceded by one of: `click`, `select`, `press` |
| `find` | Any bold (`**...**`, `__...__`) or emphasized (`*...*`, `_..._`) text |
| `type` | Quoted text preceded by one of: `type`, `enter`, `input` |

An action that isn't in the table has no pattern, so the pattern rule never matches it.

When a step's text is in a file that the page includes, see [Injecting into shared snippets and partials](#injecting-into-shared-snippets-and-partials).

## Example

**Source (`docs/guide.md`) after injecting `tests/search.yaml`:**
```markdown
<!-- test {"testId":"search-kittens"} -->
## Search Guide

1. Go to [DuckDuckGo](https://duckduckgo.com).
<!-- step {"goTo":"https://duckduckgo.com"} -->
2. In the search bar, type "American Shorthair kittens".
<!-- step {"type":{"keys":"American Shorthair kittens","selector":"#search_form_input_homepage"}} -->
3. Press **Enter**.
<!-- step {"type":{"keys":"$ENTER$"}} -->
<!-- test end -->
```

## Running injected tests: `detectSteps` and markup noise

Once tests are injected, Doc Detective finds them when it scans the source files (point the config `input` at the docs directory). Two behaviors trip people up:

- **Explicit inline statements are always detected.** The `{/* test */}` / `{/* step */}` markers you inject are honored **regardless of the `detectSteps` config value** — `detectSteps` does *not* gate them.
- **`detectSteps` only toggles *markup auto-detection*** — the implicit steps Doc Detective infers from prose (hyperlinks → `checkLink`, `**bold**` → `find`, fenced ` ```bash `/` ```json ` blocks → `runCode`, etc.). Its schema **default is `true`**.

So for a suite built from explicit inline steps, set **`detectSteps: false`**. This is the reliable way to silence the noise: a docs page's own code fences and bold text are otherwise scooped up as extra (often invalid) auto-detected steps. To keep auto-detection on but tailor *which* patterns fire, override the file type's `markup` array with your own pattern list (the schema requires it to be non-empty, so disabling everything is done via `detectSteps: false`, not an empty `markup`).

## Injecting into shared snippets and partials

Before Doc Detective looks for tests, it replaces each include directive with the included file's content, so it reads a page as it renders. Supported directives are AsciiDoc `include::`, MkDocs `--8<--`, mdBook `{{#include}}`, Fern `<Markdown src>`, MDX component imports, and reStructuredText `.. include::`. The `resolveIncludes` field in `.doc-detective.json` or `.doc-detective.yaml` controls this and defaults to `true`. Include resolution changes where an injected test runs:

- **A test in a partial runs inside each page that includes it.** A partial is a file that another input includes. Its tests run in reading order, once in each page that includes it. A partial included by 10 pages runs 10 times, and a failure shows in each page's results. The partial doesn't also run on its own, even when it's inside the configured `input`. A file listed in `beforeAll` or `afterAll` is the exception: it still runs in that phase, and its tests also run inside each page that includes it. To run a partial by itself, run Doc Detective with that file as the only `--input`.
- **A test can start on a page and continue in a partial.** Keep each test's `test` and `test end` markers in the same file. For a test that spans an include, put both markers in the page, around the include directive, and put the step markers in the partial. A `test` marker in a partial without its `test end` would open a test in every page that includes it.
- **Results point at the file that holds each statement.** For a test or step from an included file, `location.file` in the results JSON holds that file's absolute path. Its `location.line` refers to that file. When a step from a partial fails, edit the file `location.file` names, not the page.
- **A broken include doesn't fail the run.** Doc Detective prints a warning on stderr, and the exit code stays the same. A missing file, a file outside the working directory, or a cycle leaves the directive as text. A tag, section, anchor, or line range that selects nothing in the file makes the directive include nothing, and its warning starts with `Couldn't find`. If a partial's tests are missing from the results, check stderr for these warnings.

During placement, a step's matching text can come from an included file. Open that file and inject the step marker there, next to the content it tests. Use the comment syntax for the partial's own file type. Doc Detective reads a partial whose extension matches no file type, such as `.txt`, with the including page's syntax. For that partial, use the including page's comment syntax, and don't stop with the unsupported file type error. If the config sets `resolveIncludes: false`, every file runs on its own, including partials.

## Configuration

If `.doc-detective.json` or `.doc-detective.yaml` exists in the working directory, its `fileTypes[].markup` patterns override the default content patterns used for placement. See [references/markup-patterns.md](references/markup-patterns.md) for the pattern schema and examples.

> **MDX support.** `.mdx` is not in the default `fileTypes` *name* list, but the built-in `markdown` file type already covers the `.mdx` extension and recognizes the `{/* … */}` inline markers — so MDX inline tests work without extra config. To suppress markup auto-detection on MDX (code fences as `runCode`, etc.) while keeping inline statements, set `detectSteps: false`.

> **Config `input` resolves relative to the config file's directory** (not the current working directory). A config at `sub/dir/.doc-detective.json` with `"input": "docs"` looks in `sub/dir/docs`. If a run reports "No tests detected," check this first — or pass `--input` on the CLI, which resolves from the cwd.

## Done when

- Each step has a comment, and each comment no rule matched has `<!-- TODO: verify step placement -->` after it.
- `<!-- test {"testId":"..."} -->` and `<!-- test end -->` wrap each test.
- Each step comment uses the syntax for its file type.
- Step comments appear in the same order as the spec's steps.
- No MDX comment payload contains `*/`.
- In preview mode, the diff is on stdout and the file is unchanged. With `apply`, the source file holds the changes.

## Related skills

- `doc-detective:generate`: Generate test specs from documentation, the opposite direction.
- `doc-detective:validate`: Validate test specs before injection.
- `doc-detective:test`: Run test specs after injection.
