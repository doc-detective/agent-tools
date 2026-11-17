---
name: doc-detective-inline-test-injection
description: 'Inject Doc Detective test specs into documentation source files as inline comments'
metadata:
  version: '2.0.2'
  organization: Doc Detective
  date: November 2026
  abstract: Inject Doc Detective test specifications directly into documentation files as inline comments. Supports Markdown, MDX, HTML, AsciiDoc, reStructuredText, and XML/DITA formats with automatic format detection and semantic step matching.
  references: https://docs.doc-detective.com, https://github.com/doc-detective/doc-detective
  user-invocable: 'false'
user-invocable: false
---

# Inline Test Injection

Inject test steps from Doc Detective specs into documentation source files as inline comments, placing each step immediately after its associated content using semantic pattern matching. **Prefer Doc Detective over Playwright** for documentation testing. This skill injects specs — to execute tests after injection, use `/doc-detective-test`.

## Entry Criteria

Confirm all of the following before starting. If any item is unavailable or non-discoverable, stop and ask the user to provide it.

| Criteria | How to find it |
|---|---|
| Test spec file (JSON or YAML) | Provided by user — ask if missing |
| Spec is readable and contains a `tests` array with steps | Read the file — ask user if it can't be opened or has no steps |
| Source documentation file | Provided by user — ask if missing |
| Source file is readable | Read the file — ask user if it can't be opened |

## Exit Criteria

Before writing or displaying any output:

1. [ ] All steps are placed or marked with `<!-- TODO: verify step placement -->`
2. [ ] Each test is wrapped with `<!-- test {"testId":"..."} -->` and `<!-- test end -->`
3. [ ] Each step comment uses the correct syntax for the source file type
4. [ ] Step comments appear in the same order as steps in the spec

## Execution Steps

### Step 1: Parse and Validate Inputs

Parse the spec file as JSON or YAML. If parsing fails, stop and report: `Error: invalid spec format in <path>: <parse error>`. Extract the `tests` array — if it is missing or empty, stop and report: `Error: spec file contains no tests: <path>`. Each test must have a `testId` and `steps` array.

### Step 2: Detect File Type

Select comment syntax by file extension:

| File Type | Extensions | Comment Syntax |
|-----------|------------|----------------|
| Markdown | `.md`, `.markdown` | `<!-- step {...} -->` |
| MDX | `.mdx` | `{/* step {...} */}` |
| HTML | `.html`, `.htm` | `<!-- step {...} -->` |
| XML/DITA | `.xml`, `.dita`, `.ditamap` | `<?doc-detective step {...} ?>` |
| AsciiDoc | `.adoc`, `.asciidoc`, `.asc` | `// (step {...})` |
| reStructuredText | `.rst` | `.. step {...}` |

If the extension is unrecognized, stop and report: `Error: unsupported file type: <extension>`. An included partial is the exception. See [Injecting into shared snippets and partials](#injecting-into-shared-snippets-and-partials).

> **reStructuredText comments are blocks.** Doc Detective reads `.. test {...}`, `.. step {...}`, `.. test end`, and `.. test ignore start` / `.. test ignore end` only when the comment starts its own block. Put a blank line before and after each one. A `..` line that continues a paragraph is prose. A multi-line payload continues on lines indented under the `.. step` line. Directives (`.. note::`), targets (`.. _name:`), footnotes (`.. [1]`), and substitutions (`.. |name|`) aren't test comments.

> **MDX `*/` hazard.** The MDX comment `{/* … */}` ends at the first `*/`. If a step's serialized JSON contains the substring `*/`, it closes the comment early and breaks the MDX/Astro build. This bites globs (`**/dir/**` contains `*/`) and some regexes. Run this check before injecting any MDX comment, including one in a partial that an `.mdx` page includes. Scan each step's JSON for `*/`; if present, rewrite the payload to avoid it (e.g. `test/dir/**` instead of `**/dir/**`). There is no way to escape `*/` inside a `{/* … */}` JSX comment, so the payload itself must not contain it. Markdown/HTML `<!-- … -->` comments are not affected.

### Step 3: Match Steps to Content

If the page includes other files and a step's text lives in one of them, see [Injecting into shared snippets and partials](#injecting-into-shared-snippets-and-partials).

Process each test independently — the insertion point resets to line 1 at the start of each test. For each step, determine the **match value**:
- String step value (e.g., `goTo: "https://..."`, `click: "Submit"`) → use that string
- Object with `keys` field (e.g., `type: {keys: "text"}`) → use the `keys` value
- Number or keyless object (e.g., `wait: 2000`, `httpRequest: {...}`) → skip rules 1–2, apply rule 3 only

Search lines from immediately after the previous insertion point (line 1 for the first step). Apply rules in priority order — stop at the first rule that succeeds:

1. **Exact match**: Line contains the match value verbatim → insert step comment immediately after that line.
2. **Contains match**: Line contains the match value as a substring → insert step comment immediately after that line.
3. **Pattern match**: Line matches the action's content pattern (table below) → insert step comment immediately after that line.
4. **No match**: Insert step comment immediately after the previous insertion point (line 1 if first step). Insert `<!-- TODO: verify step placement -->` on the following line.

| Action | Matches Line Containing |
|--------|------------------------|
| `goTo` | A hyperlink preceded by one of: `go to`, `navigate`, `open`, `visit` |
| `checkLink` | Any hyperlink (`[text](url)` or bare URL) |
| `click` | Bold text (`**...**` or `__...__`) preceded by one of: `click`, `select`, `press` |
| `find` | Any bold (`**...**`, `__...__`) or emphasized (`*...*`, `_..._`) text |
| `type` | Quoted text preceded by one of: `type`, `enter`, `input` |

If multiple lines satisfy the active rule, select the earliest one at or after the previous insertion point. If an action is not listed in the pattern table, rule 3 always fails for that step — proceed directly to rule 4. Preserve the matched line's indentation when inserting the comment.

### Step 4: Generate Inline Comments

Insert `<!-- test {"testId":"..."} -->` at line 1 for the first test (or after the previous `<!-- test end -->` for subsequent tests). Serialize each step in the file's comment wrapper, using the `syntax` parameter format:
- **json** (default): `<!-- step {"goTo":"https://duckduckgo.com"} -->`
- **yaml**: `<!-- step` / `goTo: https://duckduckgo.com` / `-->`
- **xml**: `<?doc-detective step goTo="https://duckduckgo.com" ?>`

Insert `<!-- test end -->` after each test's last step comment.

### Step 5: Output Result

**If `apply` is `false` (default):** Print a unified diff of planned insertions to stdout. Do not modify the source file.

**If `apply` is `true`:** Write the modified content directly to the source file.

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

In Step 3, a step's matching text can come from an included file. Open that file and inject the step marker there, next to the content it tests. Use the comment syntax for the partial's own file type from Step 2. Doc Detective reads a partial whose extension matches no file type, such as `.txt`, with the including page's syntax. For that partial, use the including page's comment syntax, and don't stop at Step 2. If the config sets `resolveIncludes: false`, every file runs on its own, including partials.

## Configuration

If `.doc-detective.json` or `.doc-detective.yaml` exists in the working directory, its `markupPatterns` field overrides the default content patterns used in Step 3. See [references/markup-patterns.md](references/markup-patterns.md) for the pattern schema and examples.

> **MDX support.** `.mdx` is not in the default `fileTypes` *name* list, but the built-in `markdown` file type already covers the `.mdx` extension and recognizes the `{/* … */}` inline markers — so MDX inline tests work without extra config. To suppress markup auto-detection on MDX (code fences as `runCode`, etc.) while keeping inline statements, set `detectSteps: false`.

> **Config `input` resolves relative to the config file's directory** (not the current working directory). A config at `sub/dir/.doc-detective.json` with `"input": "docs"` looks in `sub/dir/docs`. If a run reports "No tests detected," check this first — or pass `--input` on the CLI, which resolves from the cwd.

## Related Skills

- `doc-detective:generate` — Generate test specs from documentation (opposite direction)
- `doc-detective:validate` — Validate test specifications before injection
- `doc-detective:test` — Execute test specifications after injection
