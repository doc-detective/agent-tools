---
description: Inject test specifications into documentation source files as inline comments
---

# Inject Inline Tests Command

Inject Doc Detective test specifications into documentation source files as inline comments, placing test steps close to their associated content using semantic pattern matching.

## Usage

```
/doc-detective:inject <spec-file> <source-file> [options]
```

**Options:**
- `--apply` - Apply changes directly (default: preview mode)
- `--syntax <format>` - Force syntax format: `json`, `yaml`, or `xml`
- `--config <path>` - Path to Doc Detective config file

## Examples

Preview changes (default):

```
/doc-detective:inject tests/search.yaml docs/search-guide.md
```

Apply changes directly:

```
/doc-detective:inject tests/login.json docs/login.md --apply
```

Use YAML syntax in inline comments:

```
/doc-detective:inject tests/api.json docs/api.mdx --syntax yaml
```

## Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. Parse Spec   │────▶│ 2. Read Source  │────▶│ 3. Match Steps  │
│    (JSON/YAML)  │     │    + Detect Type│     │    Semantically │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                        ┌─────────────────┐     ┌────────▼────────┐
                        │ 5. Apply/Preview│◀────│ 4. Generate     │
                        │    Changes      │     │    Inline Cmts  │
                        └─────────────────┘     └─────────────────┘
```

### Step 1: Parse Test Spec

Load the test specification file (JSON or YAML). The spec should contain tests with steps:

```yaml
tests:
  - testId: search-kittens
    steps:
      - goTo: https://duckduckgo.com
      - type:
          keys: American Shorthair kittens
          selector: "#search_form_input_homepage"
```

### Step 2: Read Source and Detect File Type

Read the documentation file and determine comment format based on extension:

| File Type | Extensions | Comment Syntax |
|-----------|------------|----------------|
| Markdown | `.md`, `.markdown` | `<!-- step {...} -->` |
| MDX | `.mdx` | `{/* step {...} */}` |
| HTML | `.html`, `.htm` | `<!-- step {...} -->` |
| XML/DITA | `.xml`, `.dita`, `.ditamap` | `<?doc-detective step {...} ?>` |
| AsciiDoc | `.adoc`, `.asciidoc`, `.asc` | `// (step {...})` |

### Step 3: Match Steps Semantically

Match each step to content in the source file using semantic patterns:

| Step Action | Matches Content Pattern | Example Match |
|-------------|------------------------|---------------|
| `goTo` | Links with navigation verbs | `Go to [Example](https://...)` |
| `checkLink` | Any hyperlink | `[Link](https://...)` |
| `click` | Bold text after action verb | `Click **Submit**` |
| `find` | Bold/emphasized text | `**Welcome**` |
| `type` | Text in quotes after type verb | `Type "hello"` |

**Matching algorithm:**
1. Exact value match → 1.0 score
2. Contains match → 0.8 score
3. Action type match only → 0.3 score
4. Sequential order bonus → +0.2
5. Breaking sequence penalty → -0.1

Steps scoring ≥0.3 are matched. Unmatched steps are flagged for review.

### Step 4: Generate Inline Comments

Serialize each step to the appropriate comment format:

**JSON (default):**
```html
<!-- step {"goTo":"https://duckduckgo.com"} -->
```

**YAML (`--syntax yaml`):**
```html
<!-- step
goTo: https://duckduckgo.com
-->
```

**XML attributes (`--syntax xml`):**
```xml
<?doc-detective step goTo="https://duckduckgo.com" ?>
```

### Step 5: Preview or Apply

**Preview mode (default):** Display a diff showing planned insertions:

```diff
--- docs/guide.md
+++ docs/guide.md (with inline tests)

@@ line 5 @@
 1. Go to [DuckDuckGo](https://duckduckgo.com).
+<!-- step {"goTo":"https://duckduckgo.com"} -->
 2. In the search bar, type "American Shorthair kittens".
```

**Apply mode (`--apply`):** Write changes directly to the file.

## Full Example

**Test spec (`tests/search.yaml`):**
```yaml
tests:
  - testId: search-kittens
    description: Search for kittens on DuckDuckGo
    steps:
      - goTo: https://duckduckgo.com
      - type:
          keys: American Shorthair kittens
          selector: "#search_form_input_homepage"
      - type:
          keys: $ENTER$
```

**Source file (`docs/guide.md`) before:**
```markdown
## Search Guide

1. Go to [DuckDuckGo](https://duckduckgo.com).
2. In the search bar, type "American Shorthair kittens".
3. Press **Enter**.
```

**After injection:**
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

## Handling Unmatched Steps

When steps cannot be matched to content:

1. **Warning displayed** in preview showing unmatched steps
2. **Suggested position** based on sequential order (after last matched step)
3. **Manual review recommended** to reposition if needed

Example warning:
```
⚠️  Unmatched steps (will be inserted at suggested positions):

  Test: search-kittens
    - Step 2: type (suggested line 8)
```

## Configuration Integration

If `.doc-detective.json` or `.doc-detective.yaml` exists in the working directory, custom markup patterns are loaded automatically. Override with `--config`:

```
/doc-detective:inject spec.json doc.md --config custom-config.json
```

See `skills/inline-test-injection/references/markup-patterns.md` for pattern customization.

## Related Commands

- `/doc-detective:generate` - Generate test specs from documentation (opposite direction)
- `/doc-detective:validate` - Validate test specifications
- `/doc-detective:test` - Execute test specifications
