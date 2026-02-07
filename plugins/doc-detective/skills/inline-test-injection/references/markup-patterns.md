# Markup Patterns Reference

This reference documents the default semantic patterns used for matching test steps to documentation content, and how to customize them via Doc Detective configuration.

## Default Patterns by File Type

### Markdown (.md, .markdown, .mdx)

| Pattern | Content Example | Detected Action |
|---------|-----------------|-----------------|
| `checkHyperlink` | `[Link text](https://example.com)` | `checkLink: "https://example.com"` |
| `goToUrl` | `Go to [Example](https://example.com)` | `goTo: "https://example.com"` |
| `clickOnscreenText` | `Click **Submit**` | `click: "Submit"` |
| `findOnscreenText` | `**Welcome**` | `find: "Welcome"` |
| `typeText` | `Type "hello world"` | `type: "hello world"` |
| `screenshotImage` | `![Screenshot](path/image.png)` | `screenshot: "path/image.png"` |

**Action verb triggers:** Click, Tap, Left-click, Choose, Select, Check, Go to, Open, Navigate to, Visit, Access, Proceed to, Launch, Press, Enter, Type

### HTML (.html, .htm)

| Pattern | Content Example | Detected Action |
|---------|-----------------|-----------------|
| `checkHyperlink` | `<a href="https://example.com">` | `checkLink: "https://example.com"` |
| `clickOnscreenText` | `Click <strong>Submit</strong>` | `click: "Submit"` |
| `findOnscreenText` | `<b>Welcome</b>` | `find: "Welcome"` |

### AsciiDoc (.adoc, .asciidoc, .asc)

| Pattern | Content Example | Detected Action |
|---------|-----------------|-----------------|
| `checkHyperlink` | `https://example.com[Link]` | `checkLink: "https://example.com"` |
| `clickOnscreenText` | `Click *Submit*` | `click: "Submit"` |
| `findOnscreenText` | `*Welcome*` | `find: "Welcome"` |

### XML/DITA (.xml, .dita, .ditamap)

| Pattern | Content Example | Detected Action |
|---------|-----------------|-----------------|
| `checkHyperlink` | `<xref href="https://example.com">` | `checkLink: "https://example.com"` |
| `clickUiControl` | `Click <uicontrol>Submit</uicontrol>` | `click: "Submit"` |
| `findUiControl` | `<uicontrol>Welcome</uicontrol>` | `find: "Welcome"` |

## Matching Algorithm

### Semantic Matching

Steps are matched to content based on:

1. **Action type match** - Step action must match pattern's detected action (e.g., `click` step matches `clickOnscreenText` pattern)
2. **Value similarity** - The step's value is compared with the captured content:
   - Exact match: 1.0 score
   - Contains match: 0.8 score
   - Partial word overlap: 0.1-0.5 score

### Sequential Ordering

After semantic matching, sequential order is considered:

- **Bonus (+0.2)**: Match maintains document order relative to previous matches
- **Penalty (-0.1)**: Match would break sequential order

Steps with similarity score ≥0.3 are considered matched.

### Unmatched Steps

Steps that don't semantically match any content are flagged as "unmatched" and placed based on:

1. After the last successfully matched step
2. At the beginning of the document if no prior matches

## Custom Patterns via Configuration

Define custom patterns in `.doc-detective.json` or `.doc-detective.yaml`:

```json
{
  "fileTypes": [
    {
      "name": "markdown",
      "markup": [
        {
          "name": "customClickButton",
          "regex": ["\\b[Pp]ress\\s+the\\s+\\[([^\\]]+)\\]\\s+button"],
          "actions": ["click"]
        },
        {
          "name": "customApiEndpoint",
          "regex": ["`(GET|POST|PUT|DELETE)\\s+(/[^`]+)`"],
          "actions": [
            {
              "httpRequest": {
                "method": "$1",
                "url": "$2"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

### Pattern Structure

| Field | Description |
|-------|-------------|
| `name` | Unique identifier for the pattern |
| `regex` | Array of regex strings (flags applied automatically) |
| `actions` | Array of actions to generate; use `$1`, `$2` for capture groups |

### Complex Actions

For actions with multiple properties:

```json
{
  "name": "typeInField",
  "regex": ["[Tt]ype\\s+\"([^\"]+)\"\\s+in(?:to)?\\s+the\\s+([\\w-]+)\\s+field"],
  "actions": [
    {
      "type": {
        "keys": "$1",
        "selector": "[name='$2']"
      }
    }
  ]
}
```

## Inline Statement Patterns

The config also supports custom inline statement patterns:

```json
{
  "fileTypes": [
    {
      "name": "markdown",
      "inlineStatements": {
        "testStart": ["<!--\\s*test\\s*([\\s\\S]*?)\\s*-->"],
        "testEnd": ["<!--\\s*test end\\s*-->"],
        "step": ["<!--\\s*step\\s*([\\s\\S]*?)\\s*-->"]
      }
    }
  ]
}
```

This allows compatibility with existing inline test conventions in your documentation.
