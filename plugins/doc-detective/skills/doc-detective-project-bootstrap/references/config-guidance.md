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
- `outputDir`: `.` (current directory)
- `recursive`: `true`
- `detectSteps`: `true`
- `fileTypes`: `["markdown", "asciidoc", "html", "dita"]`

### `detectSteps`: what it controls

`detectSteps` defaults to **`true`** and toggles only **markup auto-detection** — the steps Doc Detective infers from prose (hyperlinks → `checkLink`, `**bold**` → `find`, fenced ` ```bash `/` ```json ` blocks → `runCode`, etc.). It does **not** gate explicit inline `{/* test */}` / `<!-- step -->` statements, which are always honored.

Set **`detectSteps: false`** when your suite is built from explicit inline steps (or standalone spec files) and you do not want a docs page's own code fences and bold text scooped up as extra, often invalid, auto-detected steps.

### Standard Minimal Config

For most projects, specify `input`, `outputDir`, and — for an explicit-step suite — `detectSteps: false`:

```json
{
  "input": "docs",
  "outputDir": ".doc-detective/results",
  "detectSteps": false
}
```

## When to Add Configuration

Only add fields when:

| Scenario | Add Field |
|----------|-----------|
| Docs not in root or `docs/` | `input` |
| Want run folders and reports in a specific location | `outputDir` |
| Want the JSON results at an exact path | `output` (a file, not a folder) |
| Multiple doc directories | `input` (array) |
| Non-default file types only | `fileTypes` |
| Using environment variables | `loadVariables` |
| Running in CI | `runOn` for context |
| Running test contexts in parallel | `concurrentRunners` |
| Need relative URL resolution | `origin` |
| Run **only** explicit inline/spec steps (no prose auto-detection) | `detectSteps: false` (default is `true`) |
| Skip the screenshot after every step, or the recording of every context | `autoScreenshot: false`, `autoRecord: false` (both default to `true`) |
| Show a variable's value in output because it isn't secret | `publicVariables` (names, `*` matches any characters) |
| Turn off post-run hints | `hints: { "enabled": false }` |

Every run writes a run folder under `<outputDir>/.doc-detective/runs/`. With the defaults, it holds a screenshot after each step that drives a browser, app, or device. It also holds a recording of each such context when the host can record it. Add `.doc-detective/` to `.gitignore` so run output stays out of commits.

## Configuration Schema Reference

From `doc-detective-common`, key fields:

```typescript
interface Config {
  input?: string | string[];      // Default: "."
  output?: string;                // JSON results file; no default
  outputDir?: string;             // Run folders and reports. Default: "."
  recursive?: boolean;            // Default: true
  loadVariables?: string;         // Path to .env file
  origin?: string;                // Base URL for relative links
  detectSteps?: boolean;          // Default: true (toggles markup auto-detection only)
  allowUnsafeSteps?: boolean;     // Default: false
  fileTypes?: FileType[];         // Default: ["markdown","asciidoc","html","dita"]
  runOn?: Context[];              // Execution contexts
  shell?: "bash"|"cmd"|"powershell"; // Default: "bash" on every platform, incl. Windows (where bash resolves to Git Bash, auto-installed if absent). Default shell for runShell steps and runCode; cmd/powershell are Windows-only. A runShell step's own shell field overrides this.
  concurrentRunners?: number | true; // Default: 1, true = CPU cores (max 4)
  logLevel?: "silent"|"error"|"warning"|"info"|"debug"; // Default: "info"
  autoScreenshot?: boolean;       // Default: true
  autoRecord?: boolean;           // Default: true
  publicVariables?: string[];     // Variable names to show unmasked
  hints?: { enabled: boolean };   // Default: { enabled: true }
}
```

### Gating contexts with `requires`

A context in `runOn` can use `requires` to declare the host capabilities it depends on. Doc Detective checks every requirement before running the context. If any is missing, the context is marked SKIPPED (the same non-failing outcome as a platform mismatch) instead of failing the run. Since `requires` can stand on its own, a `runOn` entry may omit `platforms` and `browsers` and gate purely on capabilities.

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
- **String**: a single command that must be resolvable on `PATH`.
- **Array of strings**: several commands, all of which must be resolvable on `PATH`.
- **Object**: any combination of these keys:
  - `commands`: resolvable on `PATH`.
  - `files`: must exist; entries expand `$VAR` and `$HOME`.
  - `env`: must be set to a non-empty value.

All listed requirements are AND-ed: the context runs only when every one is satisfied. This pairs naturally with native app surfaces. Gate an app test to the platforms it supports with `runOn` platforms (`["windows"]`, `["mac"]`, or both). Add a `requires` for the tooling it needs.

### Hints

After a test run, Doc Detective may print one short, contextual hint with code samples and links. Hints are shown only on a TTY at the default `info` log level. Disable hints via config or the `--no-hints` CLI flag:

```json
{
  "hints": { "enabled": false }
}
```

## Concurrent Test Runners

Run multiple test contexts in parallel with the `concurrentRunners` config option or the `--concurrent-runners` CLI flag.

### Configuration

```json
{ "concurrentRunners": true }
```

Set `true` to use your CPU core count (capped at 4). Set a number for explicit control:

```json
{ "concurrentRunners": 4 }
```

### CLI Flag

```bash
npx doc-detective --concurrent-runners 4
npx doc-detective --concurrent-runners true   # CPU core count (capped at 4)
```

Default: `1` (runs contexts sequentially).

### Limitations

Keep `concurrentRunners` at `1` when tests share variables across contexts. A step's `variables` field writes to `process.env`, so a context that reads a value another context sets can run before that value exists.

Recordings don't need this: the `browser` engine records each context's own window, and Doc Detective runs `ffmpeg` recordings, which capture the whole display, one at a time on its own.

## Config By Project Type

### Static Site Generator (Docusaurus, VitePress, etc.)

```json
{
  "input": "docs",
  "outputDir": ".doc-detective/results",
  "detectSteps": false
}
```

### Next.js with MDX

```json
{
  "input": ["pages", "app"],
  "outputDir": ".doc-detective/results",
  "detectSteps": false,
  "fileTypes": ["markdown"]
}
```

### MDX with inline tests only (Astro Starlight, Docusaurus, etc.)

The built-in `markdown` file type already covers `.mdx` and recognizes the `{/* test */}` / `{/* step */}` markers, so MDX inline tests need no special setup. With `detectSteps: false`, markup auto-detection is off, so the docs' own ` ```bash `/` ```json ` fences and `**bold**` are left alone and only the explicit inline steps run:

```json
{
  "input": "docs/src/content/docs",
  "outputDir": ".doc-detective/results",
  "detectSteps": false
}
```

(To silence code-fence/bold auto-detection, `detectSteps: false` is the supported switch. The `markup` array can't be emptied to disable patterns, because the schema requires it to be non-empty. Narrow it by listing only the patterns you want instead.)

### Monorepo with Multiple Doc Locations

```json
{
  "input": [
    "packages/*/docs",
    "docs"
  ],
  "outputDir": ".doc-detective/results",
  "detectSteps": false
}
```

### Project with Environment Variables

```json
{
  "input": "docs",
  "outputDir": ".doc-detective/results",
  "detectSteps": false,
  "loadVariables": ".env.test"
}
```

### API Documentation with Base URL

```json
{
  "input": "docs",
  "outputDir": ".doc-detective/results",
  "detectSteps": false,
  "origin": "https://api.example.com"
}
```

### DITA Documentation

```json
{
  "input": "content",
  "outputDir": ".doc-detective/results",
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
{ "outputDir": "custom-output" }

// Bootstrap would set ".doc-detective/results"
// Result: Keep existing
{ "outputDir": "custom-output" }
```

## Anti-Patterns to Avoid

### Don't Override Defaults Unnecessarily

❌ Bad:
```json
{
  "input": ".",
  "outputDir": ".",
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

Doc Detective masks the values of variables it uses as `***NAME***` in logs, reports, and results files. Screenshots and recordings are pixels, so masking covers them only partly. Browser screenshots blur page text that holds a secret. Recordings can still show it, and so can text in iframes, shadow DOM, or a canvas, and native app and device captures. Review captures before you share run artifacts, or turn them off with `"autoScreenshot": false` and `"autoRecord": false`.

### Don't Use the Deprecated `debug` Config Field

The `debug` config field is deprecated and ignored. For diagnostic output, use the `debug` subcommand or `DOC_DETECTIVE_DEBUG` environment variable instead:

```bash
# Dedicated subcommand
npx doc-detective debug

# Environment variable (CI-friendly)
DOC_DETECTIVE_DEBUG=true npx doc-detective
```

See [Fix Failing Tests](../../doc-detective-doc-testing/references/fix-failing-tests.md#environment-and-configuration-troubleshooting) for details.

## Validation

After generating config, verify it:

```bash
# Test config loads correctly: exits 0 when it's valid and tests resolve, 2 otherwise
npx doc-detective --config .doc-detective.json --dry-run

# Or validate with JSON Schema
npx ajv validate -s https://raw.githubusercontent.com/doc-detective/common/refs/heads/main/dist/schemas/config_v3.schema.json -d .doc-detective.json
```

## Related Resources

- Config schema: https://docs.doc-detective.com/reference/schemas/config
- File types: https://docs.doc-detective.com/docs/test-docs/detected
- Contexts: https://docs.doc-detective.com/docs/test-docs/platforms-and-browsers
- doc-detective-common: https://github.com/doc-detective/doc-detective-common
