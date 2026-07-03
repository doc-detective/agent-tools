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
- `detectSteps`: `true`
- `fileTypes`: `["markdown", "asciidoc", "html", "dita"]`

### `detectSteps`: what it controls

`detectSteps` defaults to **`true`** and toggles only **markup auto-detection** — the steps Doc Detective infers from prose (hyperlinks → `checkLink`, `**bold**` → `find`, fenced ` ```bash `/` ```json ` blocks → `runCode`, etc.). It does **not** gate explicit inline `{/* test */}` / `<!-- step -->` statements, which are always honored.

Set **`detectSteps: false`** when your suite is built from explicit inline steps (or standalone spec files) and you do not want a docs page's own code fences and bold text scooped up as extra, often invalid, auto-detected steps.

### Standard Minimal Config

For most projects, specify `input`, `output`, and — for an explicit-step suite — `detectSteps: false`:

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
| Run **only** explicit inline/spec steps (no prose auto-detection) | `detectSteps: false` (default is `true`) |

## Configuration Schema Reference

From `doc-detective-common`, key fields:

```typescript
interface Config {
  input?: string | string[];      // Default: "."
  output?: string;                // Default: "."
  recursive?: boolean;            // Default: true
  loadVariables?: string;         // Path to .env file
  origin?: string;                // Base URL for relative links
  detectSteps?: boolean;          // Default: true (toggles markup auto-detection only)
  allowUnsafeSteps?: boolean;     // Default: false
  fileTypes?: FileType[];         // Default: ["markdown","asciidoc","html","dita"]
  runOn?: Context[];              // Execution contexts
  concurrentRunners?: number;     // Default: 1
  logLevel?: "silent"|"error"|"warning"|"info"|"debug"; // Default: "info"
}
```

### Gating contexts with `requires`

A context in `runOn` can use `requires` to declare the host capabilities it depends on. Doc Detective checks every requirement before running the context, and if any is missing the context is marked SKIPPED — the same non-failing outcome as a platform mismatch — instead of failing the run. Since `requires` can stand on its own, a `runOn` entry may omit `platforms` and `browsers` and gate purely on capabilities.

`requires` accepts three progressive forms:

```json
{ "runOn": [{ "requires": "appium" }] }
```

```json
{ "runOn": [{ "requires": ["node", "appium"] }] }
```

```json
{
  "runOn": [{
    "requires": {
      "commands": ["appium"],
      "files": ["$HOME/.appium/node_modules"],
      "env": ["APPIUM_HOME"]
    }
  }]
}
```

**Forms:**
- **String** — a single command that must be resolvable on `PATH`.
- **Array of strings** — several commands, all of which must be resolvable on `PATH`.
- **Object** — any combination of `commands` (resolvable on `PATH`), `files` (must exist; entries expand `$VAR` and `$HOME`), and `env` (must be set to a non-empty value).

All listed requirements are AND-ed — the context runs only when every one is satisfied. This pairs naturally with native app surfaces: gate a Windows app test with `runOn` platforms `["windows"]` plus a `requires` for the tooling it needs.

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

### MDX with inline tests only (Astro Starlight, Docusaurus, etc.)

The built-in `markdown` file type already covers `.mdx` and recognizes the `{/* test */}` / `{/* step */}` markers, so MDX inline tests need no special setup. With `detectSteps: false`, markup auto-detection is off, so the docs' own ` ```bash `/` ```json ` fences and `**bold**` are left alone and only the explicit inline steps run:

```json
{
  "input": "docs/src/content/docs",
  "output": ".doc-detective/results",
  "detectSteps": false
}
```

(To silence code-fence/bold auto-detection, `detectSteps: false` is the supported switch. The `markup` array can't be emptied to disable patterns — the schema requires it to be non-empty — so narrow it by listing only the patterns you want instead.)

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

> **`input` resolves relative to the config file's directory**, not the current working directory. A config at `sub/.doc-detective.json` with `"input": "docs"` scans `sub/docs`. If a run reports "No tests detected," verify this — keep the config at the repo root, or pass `--input` on the CLI (which resolves from the cwd).

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
