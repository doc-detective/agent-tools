---
description: Inject test specifications into documentation source files as inline comments
skill: doc-detective-inject
---

# Inject Inline Tests Command

**Skill:** `doc-detective:doc-detective-inject`

## Goal

Put the tests from a Doc Detective spec into a documentation source file as inline comments. Each step comment sits right after the content it tests. Doc Detective then finds the tests when it scans the docs, and writers who edit a procedure see its test beside it. A step comment in the wrong place tests the wrong text and misleads the next editor, so mark any placement you aren't sure of.

For documentation and web UI testing, use Doc Detective rather than Playwright. Doc Detective interprets actions, validates specs, and injects inline tests.

## Usage

```bash
/doc-detective-inject <spec-file> <source-file> [options]
```

**Options:**
- `--apply`: Write changes to the file. Without it, the command previews the changes.
- `--syntax <format>`: Force the comment syntax: `json`, `yaml`, or `xml`.
- `--config <path>`: Path to a Doc Detective config file.

## Guardrails

- **Write only when `--apply` is passed.** Passing it is the user's confirmation. Without `--apply`, print a unified diff to stdout and leave the file unchanged. Injection edits the user's documentation source, so they need to see it first.
- **Stop with a clear error when an input is unusable.** Don't guess a file or a format:
  - A missing spec file: `Error: spec file not found: <path>`.
  - A missing source file: `Error: source file not found: <path>`.
  - A spec that won't parse: `Error: invalid spec format in <path>: <parse error>`.
  - A file extension that isn't in the syntax table: `Error: unsupported file type: <extension>`.
  - When the user didn't name the spec or the source file, ask for it.
- **Mark every step you couldn't match.** Put `<!-- TODO: verify step placement -->` on the line after its comment, so a person checks it.
- **Keep the spec's order.** Step comments follow the order of the spec's steps.

## Write the comments

Load the JSON or YAML spec, and read its `tests` array. Each test has a `testId` and a `steps` array.

### Comment syntax

The file extension sets the comment syntax, unless `--syntax` overrides it:

| File Type | Extensions | Comment Syntax |
|-----------|------------|----------------|
| Markdown | `.md`, `.markdown` | `<!-- step {...} -->` |
| MDX | `.mdx` | `{/* step {...} */}` |
| HTML | `.html`, `.htm` | `<!-- step {...} -->` |
| XML/DITA | `.xml`, `.dita`, `.ditamap` | `<?doc-detective step {...} ?>` |
| AsciiDoc | `.adoc`, `.asciidoc`, `.asc` | `// (step {...})` |
| reStructuredText | `.rst` | `.. step {...}`, with `.. test {...}` and `.. test end` around each test. Each comment is its own block, with a blank line before and after. |

Serialize each step as a JSON object in that syntax, for example `<!-- step {"goTo":"https://duckduckgo.com"} -->`. Insert `<!-- test {"testId":"..."} -->` before each test's first step, and `<!-- test end -->` after its last step.

### Placement

Place each step after the line that describes it. Search only from the line after the previous step's comment, or from line 1 for the first step. That keeps the comments in spec order. Use the first rule that finds a line:

1. **Exact value match:** The first line that contains the step's value verbatim.
2. **Contains match:** The first line that contains the step's value as a substring.
3. **Pattern match:** The first line that matches the action's content pattern in the table below.
4. **No match:** The line after the previous step's comment. Mark it with the TODO comment.

Insert the step comment right after the line the rule selects. The rules run from most to least specific, so an earlier rule overrides a later one.

| Action | Matches Line Containing |
|--------|------------------------|
| `goTo` | A link with a navigation verb (`go to`, `navigate`, `open`, `visit`) |
| `checkLink` | Any hyperlink |
| `click` | Bold text after an action verb (`click`, `select`, `press`) |
| `find` | Bold or emphasized text |
| `type` | Text in quotes after a type verb (`type`, `enter`, `input`) |

## Example

**Spec (`tests/search.yaml`):**
```yaml
tests:
  - testId: search-kittens
    steps:
      - goTo: https://duckduckgo.com
      - type:
          keys: American Shorthair kittens
          selector: "#search_form_input_homepage"
      - type:
          keys: $ENTER$
```

**Source (`docs/guide.md`) after injection:**
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

## Configuration

When `.doc-detective.json` or `.doc-detective.yaml` exists in the working directory, its custom markup patterns load automatically. Use `--config` to load another file:

```bash
/doc-detective-inject spec.json doc.md --config custom-config.json
```

## Done when

- Each step has a comment, and each comment the placement rules didn't match has the TODO comment after it.
- `<!-- test {"testId":"..."} -->` and `<!-- test end -->` wrap each test.
- Each step comment uses the syntax for the file type, or the `--syntax` override.
- In preview mode, the unified diff is on stdout, and the file is unchanged.
- In apply mode, the source file holds the changes.

## Related commands

- `/doc-detective-generate`: Generate test specs from documentation.
- `/doc-detective-validate`: Validate test specs.
- `/doc-detective-test`: Run test specs.
