# Configuration Guidance

Best practices for generating minimal, effective Doc Detective configurations. Follow the principle: **smallest reasonable config based on the project**.

## Core Principle

Generate only the configuration needed. Doc Detective has sensible defaults—don't override unless necessary.

### Minimal Valid Config

The absolute minimum config is an empty object:

```json
{}
```

This uses all defaults:
- `input`: `.` (current directory)
- `output`: `.` (current directory)
- `recursive`: `true`
- `detectSteps`: `false`
- `fileTypes`: `["markdown", "asciidoc", "html", "dita"]`

### Standard Minimal Config

For most projects, specify only `input`, `output`, and `detectSteps`:

```json
{
  "input": "docs",
  "output": ".doc-detective/results",
  "detectSteps": false
}
```

## When to Add Configuration

Only add fields when:

| Scenario | Add Field |
|----------|-----------|
| Docs not in root or `docs/` | `input` |
| Want results in specific location | `output` |
| Multiple doc directories | `input` (array) |
| Non-default file types only | `fileTypes` |
| Using environment variables | `loadVariables` |
| Running in CI | `runOn` for context |
| Need relative URL resolution | `origin` |
| Want to detect testable procedures from markup syntax | `detectSteps` |

## Configuration Schema Reference

From `doc-detective-common`, key fields:

```typescript
interface Config {
  input?: string | string[];      // Default: "."
  output?: string;                // Default: "."
  recursive?: boolean;            // Default: true
  loadVariables?: string;         // Path to .env file
  origin?: string;                // Base URL for relative links
  detectSteps?: boolean;          // Default: false
  allowUnsafeSteps?: boolean;     // Default: false
  fileTypes?: FileType[];         // Default: ["markdown","asciidoc","html","dita"]
  runOn?: Context[];              // Execution contexts
  concurrentRunners?: number;     // Default: 1
  logLevel?: "silent"|"error"|"warning"|"info"|"debug"; // Default: "info"
}
```

## CLI-Only Options

Some options are only available via CLI arguments and cannot be set in the config file.

### `--reporters` / `-r`

Select which output reporters to use. Accepts multiple values.

**Available reporters:**

| Reporter | Description |
|----------|-------------|
| `terminal` | Outputs results to the console with colored status indicators |
| `json` | Writes results to a JSON file (default: `testResults-<timestamp>.json`) |
| `html` | Generates a self-contained HTML report with interactive features |

**Default:** `terminal json` (both terminal output and JSON file)

**Usage:**

```bash
# Default: terminal output + JSON file
doc-detective runTests

# Add HTML report to default output
doc-detective runTests --reporters terminal json html

# HTML report only
doc-detective runTests -r html

# JSON file only (no terminal output)
doc-detective runTests -r json
```

**HTML reporter features:**

- Self-contained single file with inlined CSS and JavaScript
- Works offline (no CDN dependencies except Google Fonts fallback)
- Dark mode toggle
- Search and filter by status (pass/fail/warning/skipped)
- Collapsible spec/test/context/step hierarchy
- Media thumbnails with lightbox for screenshots and recordings
- JSON download button to export raw results
- Print-friendly layout

**Output path behavior:**

- If `output` ends in `.html` or `.htm`, writes to that exact file
- Otherwise, generates `testResults-<timestamp>.html` in the output directory
- Automatically handles filename collisions with numeric suffix

## Config By Project Type

### Static Site Generator (Docusaurus, VitePress, etc.)

```json
{
  "input": "docs",
  "output": ".doc-detective/results",
  "detectSteps": false
}
```

### Next.js with MDX

```json
{
  "input": ["pages", "app"],
  "output": ".doc-detective/results",
  "detectSteps": false,
  "fileTypes": ["markdown"]
}
```

### Monorepo with Multiple Doc Locations

```json
{
  "input": [
    "packages/*/docs",
    "docs"
  ],
  "output": ".doc-detective/results",
  "detectSteps": false
}
```

### Project with Environment Variables

```json
{
  "input": "docs",
  "output": ".doc-detective/results",
  "detectSteps": false,
  "loadVariables": ".env.test"
}
```

### API Documentation with Base URL

```json
{
  "input": "docs",
  "output": ".doc-detective/results",
  "detectSteps": false,
  "origin": "https://api.example.com"
}
```

### DITA Documentation

```json
{
  "input": "content",
  "output": ".doc-detective/results",
  "detectSteps": false,
  "fileTypes": ["dita"],
  "processDitaMaps": true
}
```

## Configuration File Formats

Doc Detective supports multiple config file formats. Use `.json` for simplicity:

| Format | Filename |
|--------|----------|
| JSON | `.doc-detective.json` |
| YAML | `.doc-detective.yaml` or `.doc-detective.yml` |
| JavaScript | `doc-detective.config.js` |

**Recommendation:** Use `.doc-detective.json` for:
- Easy parsing and editing
- No runtime dependencies
- Clear, explicit values

## Config Merge Strategy

When merging with existing config:

### Array Fields (Merge & Deduplicate)

```javascript
// Existing
{ "input": ["docs"] }

// New detection found "guides"
// Result
{ "input": ["docs", "guides"] }
```

### Object Fields (Deep Merge)

```javascript
// Existing
{ "runOn": [{ "app": "chrome" }] }

// Bootstrap adds Firefox
// Result
{ "runOn": [{ "app": "chrome" }, { "app": "firefox" }] }
```

### Scalar Fields (Prefer Existing)

```javascript
// Existing
{ "output": "custom-output" }

// Bootstrap would set ".doc-detective/results"
// Result: Keep existing
{ "output": "custom-output" }
```

## Anti-Patterns to Avoid

### Don't Override Defaults Unnecessarily

❌ Bad:
```json
{
  "input": ".",
  "output": ".",
  "recursive": true,
  "detectSteps": true,
  "logLevel": "info",
  "concurrentRunners": 1
}
```

✅ Good:
```json
{}
```

### Don't Include All File Types When Only Using One

❌ Bad:
```json
{
  "fileTypes": ["markdown", "asciidoc", "html", "dita"]
}
```

✅ Good (when only using Markdown):
```json
{}
```
(Default already includes all types, Doc Detective ignores missing types)

### Don't Use Absolute Paths

❌ Bad:
```json
{
  "input": "/Users/dev/project/docs"
}
```

✅ Good:
```json
{
  "input": "docs"
}
```

### Don't Commit Sensitive Data

❌ Bad:
```json
{
  "integrations": {
    "docDetectiveApi": {
      "apiKey": "sk-actual-key-here"
    }
  }
}
```

✅ Good:
```json
{
  "loadVariables": ".env",
  "integrations": {
    "docDetectiveApi": {
      "apiKey": "$DOC_DETECTIVE_API_KEY"
    }
  }
}
```
Then in `.env` (gitignored):
```
DOC_DETECTIVE_API_KEY=sk-actual-key-here
```

## Validation

After generating config, verify it:

```bash
# Test config loads correctly
npx doc-detective --config .doc-detective.json --dry-run

# Or validate with JSON Schema
npx ajv validate -s https://raw.githubusercontent.com/doc-detective/common/refs/heads/main/dist/schemas/config_v3.schema.json -d .doc-detective.json
```

## Related Resources

- Config schema: https://doc-detective.com/docs/references/schemas/config
- File types: https://doc-detective.com/docs/get-started/tests#detected-tests
- Contexts: https://doc-detective.com/docs/get-started/config/contexts
- doc-detective-common: https://github.com/doc-detective/doc-detective-common
