# Documentation Detection Patterns

Reference for identifying documentation files and their formats.

## Supported File Types

| Type | Extensions | Primary Indicators |
|------|------------|-------------------|
| Markdown | `.md`, `.markdown` | Frontmatter, headings, links |
| MDX | `.mdx` | JSX imports, frontmatter |
| AsciiDoc | `.adoc`, `.asciidoc`, `.asc` | `=` headers, `include::`, `:attributes:` |
| reStructuredText | `.rst` | `.. directive::`, underline headers |
| HTML | `.html`, `.htm` | `<article>`, `<main>`, `<section>` |
| DITA | `.dita`, `.ditamap`, `.xml` | `<!DOCTYPE topic`, `<task>`, `<concept>` |
| Gherkin | `.feature` | `Feature:`, `Scenario:`, `Given`/`When`/`Then` steps |

Don't generate specs for Gherkin `.feature` files. Doc Detective runs each scenario as a test, and its steps run when they use Doc Detective's step phrases. Steps written for a Cucumber suite's step definitions don't map and warn. Count the files in the detection report.

If the config sets `fileTypes` and the repository has `.feature` files, add `"gherkin"` to the list. A `fileTypes` list replaces the default list, so Doc Detective reads no `.feature` files when the list leaves out `"gherkin"`.

## Detection Patterns

Use these patterns:

### Glob Patterns by Type

```bash
# Markdown
**/*.md
**/*.markdown
!**/node_modules/**
!**/dist/**
!**/build/**
!**/.git/**
!**/CHANGELOG.md

# MDX
**/*.mdx

# AsciiDoc
**/*.adoc
**/*.asciidoc
**/*.asc

# reStructuredText
**/*.rst

# Gherkin (runs as-is; don't generate specs)
**/*.feature

# HTML (documentation only)
**/docs/**/*.html
**/documentation/**/*.html
!**/node_modules/**
```

### Content-Based Detection

When extension is ambiguous, check content:

**Markdown indicators:**
- Line starting with `# ` (heading)
- `[text](url)` patterns
- `**bold**` or `*italic*`
- Frontmatter: `---` at start followed by YAML

**MDX indicators:**
- `import` statements at top
- JSX syntax: `<Component />`
- `export` statements

**AsciiDoc indicators:**
- `= Title` (document title)
- `== Heading` (sections)
- `include::file.adoc[]`
- `:attribute: value`

**reStructuredText indicators:**
- Title underlined with `===`
- `.. directive::` patterns
- `:role:`text`` inline markup

**DITA indicators:**
- `<!DOCTYPE task` or `<!DOCTYPE topic`
- `<task>`, `<concept>`, `<reference>` elements
- `<?xml version="1.0"?>` header

## Common Documentation Directories

Prioritize scanning these directories:

```
docs/
documentation/
doc/
guides/
tutorials/
pages/        # Common in Next.js/MDX projects
content/      # Common in static site generators
src/docs/
src/pages/
```

## Exclusion Patterns

Always exclude:

```
node_modules/
dist/
build/
.git/
.next/
.nuxt/
coverage/
vendor/
__pycache__/
*.min.*
```

## Detection Output Format

Report detection results in a structured format:

```
📁 Documentation detected:

Type        | Count | Locations
------------|-------|---------------------------
Markdown    | 12    | docs/, README.md
MDX         | 3     | pages/
AsciiDoc    | 0     | —
RST         | 0     | —
HTML        | 2     | documentation/
DITA        | 0     | —
Gherkin     | 0     | —
------------|-------|---------------------------
Total       | 17    | 

Estimated testable procedures: 8-15
```

## Integration with Doc Detective Config

Map detected file types to Doc Detective `fileTypes` config:

| Detected Type | Config Value |
|---------------|--------------|
| Markdown | `"markdown"` |
| MDX | `"markdown"` (same patterns) |
| AsciiDoc | `"asciidoc"` |
| reStructuredText | `"rst"` |
| HTML | `"html"` |
| DITA | `"dita"` |
| Gherkin | `"gherkin"` |

Example generated config segment:

```json
{
  "fileTypes": ["markdown", "html"]
}
```

This list replaces the default list. When the repository has `.feature` files that should run, add `"gherkin"`.

## Related Resources

- Doc Detective resolver: https://github.com/doc-detective/doc-detective-resolver
- File type configuration: https://docs.doc-detective.com/reference/schemas/config
- Markup patterns: https://docs.doc-detective.com/docs/test-docs/detected
