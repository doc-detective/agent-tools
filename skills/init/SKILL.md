---
name: init
description: 'Initialize Doc Detective in a repository with documentation detection, config generation, test creation, and iterative fix loop'
user-invocable: true
metadata:
  version: '1.1.0'
  organization: Doc Detective
  date: March 2026
  abstract: Initialize Doc Detective in a repository with documentation detection, config generation, test creation, and iterative fix loop. Supports interactive and CI modes.
  references: https://doc-detective.com, https://github.com/doc-detective/doc-detective
---

# Init Command

**Skill:** `doc-detective:init`

Bootstrap Doc Detective in a repository. Detects documentation, generates minimal configuration, creates tests for identified procedures, runs them, and iteratively fixes failures with confidence-based suggestions.

## Usage

```
/doc-detective:init [options]
```

**Modes:**

| Mode | Description |
|------|-------------|
| Interactive (default) | Guided setup with prompts at key decision points |
| CI (`--ci`) | Non-interactive, uses sensible defaults, no prompts |

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--ci` | false | Run in non-interactive CI mode |
| `--auto-fix` | false | Apply all test fixes regardless of confidence |
| `--fix-threshold <0-100>` | 80 | Confidence threshold for auto-applying fixes |
| `--dry-run` | false | Show planned changes without applying |
| `--skip-tests` | false | Generate config and tests but don't execute |
| `--skip-fix-loop` | false | Run tests but skip iterative fixing |

## Examples

```bash
# Interactive setup
/doc-detective:init

# CI mode with defaults
/doc-detective:init --ci

# Preview without changes
/doc-detective:init --dry-run

# Auto-fix all failures
/doc-detective:init --auto-fix

# Custom confidence threshold
/doc-detective:init --fix-threshold 70

# Only generate config and tests
/doc-detective:init --skip-tests
```

## Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DOC DETECTIVE INIT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐  │
│  │ 1.DETECT │──▶│2.CONFIG  │──▶│3.GENERATE│──▶│ 4.RUN    │──▶│ 5.FIX    │  │
│  │          │   │          │   │          │   │          │   │          │  │
│  │ Scan for │   │ Create   │   │ Create   │   │ Execute  │   │ Analyze  │  │
│  │ docs     │   │ minimal  │   │ tests    │   │ tests    │   │ failures │  │
│  └──────────┘   │ config   │   │ from     │   │          │   │ & fix    │  │
│                 └──────────┘   │ docs     │   └──────────┘   └──────────┘  │
│                                └──────────┘                                 │
│                                                                             │
│  Config handling:                                                           │
│  • New config: Create silently                                              │
│  • Existing config: Merge + prompt for confirmation                         │
│                                                                             │
│  Fix loop:                                                                  │
│  • Confidence ≥ threshold: Auto-apply                                       │
│  • Confidence < threshold: Flag for user review                             │
│  • Max 3 iterations per test                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Phase Details

### Phase 1: Detect Documentation

The agent scans the repository to understand documentation structure and gather context for subsequent phases.

**What the agent looks for:**

1. **Documentation directories** - Common paths like `docs/`, `documentation/`, `content/`, `pages/`
2. **File types** - Identify supported formats and their locations
3. **Structure patterns** - How docs are organized (flat, nested, by feature, by audience)
4. **Existing configuration** - Check for `.doc-detective.json`, `doc-detective.config.js`, etc.
5. **Related tooling** - Look for existing test frameworks, CI configs, build systems

**Supported formats:**
- Markdown (`.md`, `.markdown`)
- MDX (`.mdx`)
- AsciiDoc (`.adoc`, `.asciidoc`, `.asc`)
- reStructuredText (`.rst`)
- HTML (`.html`, `.htm`)
- DITA (`.dita`, `.ditamap`, `.xml`)

**Agent gathers:**
- File counts by type and location
- Directory structure overview
- Sample files for pattern analysis
- Potential procedure-heavy files (tutorials, guides, how-tos)
- Any existing test specs or config files

**Output:**
```
📁 Documentation detected:
   Markdown: 12 files (docs/, README.md)
   MDX: 3 files (pages/)
   
   Total: 15 documentation files
   Estimated procedures: 8-12
   
   Key directories: docs/, pages/
   Tutorials found: 3
   How-to guides: 5
```

### Phase 2: Configure

Generate minimal `.doc-detective.json` following "smallest reasonable config" principle.

**Config handling:**

| Scenario | Action |
|----------|--------|
| No existing config | Create silently |
| Existing config | Merge + prompt for confirmation |
| CI mode + existing | Skip merge, use existing |

**Minimal config example:**
```json
{
  "input": "docs",
  "output": ".doc-detective/results",
  "detectSteps": false
}
```

See `skills/project-bootstrap/references/config-guidance.md` for detailed guidance.

### Phase 3: Generate Tests

Identify testable procedures and create complete tests using the `doc-testing` skill workflow:

1. Analyze documentation structure (headings, lists, action verbs)
2. Extract sequential procedures
3. Map to Doc Detective actions
4. Validate each generated spec
5. Track progress

**Progress display:**
```
📝 Generating tests...

| # | Source File | Procedure | Status |
|---|-------------|-----------|--------|
| 1 | docs/login.md | Login flow | ✅ Generated (6 steps) |
| 2 | docs/setup.md | Installation | ✅ Generated (4 steps) |
| 3 | docs/api.md | API auth | ⏳ Generating... |
```

### Phase 4: Execute Tests

Run generated tests:

```bash
doc-detective run --input .doc-detective/tests/ --output .doc-detective/results/
```

**Results:**
```
🧪 Test Execution Results

Summary:
  Tests: 8 passed, 2 failed
  Steps: 45 passed, 5 failed
  
Failed Tests:
  ❌ docs/login.md#login-flow - Step 4: "Element 'Sign In' not found"
  ❌ docs/api.md#api-auth - Step 2: "Unexpected status code 401"
```

### Phase 5: Fix Loop

Analyze failures and propose fixes with confidence scoring:

```
⚠️ Low confidence fix (65%) for docs/login.md#login-flow step 4:

  Issue: Element 'Sign In' not found
  
  Proposed fix: 
    Before: { "find": "Sign In" }
    After:  { "find": "Log In" }
  
  Reason: Page may have changed button text
  
  [A]pply fix  [S]kip  [E]dit manually  [Q]uit fix loop
```

**Confidence thresholds:**

| Score | Action |
|-------|--------|
| ≥ threshold (default 80%) | Auto-apply |
| < threshold | Flag user for review |
| < 50% | Always flag user |

**Fix loop limits:**
- Max 3 iterations per test
- Unresolved after 3 attempts → "needs manual review"

## Output

After completion:

```
✅ Doc Detective Bootstrap Complete

Configuration:
  📄 Created .doc-detective.json

Tests Generated:
  📝 8 test specs in .doc-detective/tests/
  
Execution Results:
  ✅ 6 tests passed
  🔧 2 tests fixed (auto-applied)
  ❌ 0 tests need manual review

Next Steps:
  • Run `doc-detective run` to execute tests
  • Add to CI: `doc-detective run --ci`
  • See .doc-detective/results/ for reports
```

## CI Integration

Use in GitHub Actions:

```yaml
name: Doc Detective
on: [push, pull_request]
jobs:
  test-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g doc-detective
      - run: doc-detective run --ci
```

## Related Commands

| Command | Description |
|---------|-------------|
| `/doc-detective:test` | Run existing tests |
| `/doc-detective:generate` | Generate tests without executing |
| `/doc-detective:validate` | Validate test specifications |
| `/doc-detective:inject` | Inject tests into source files |

## Related Skills

- `doc-testing` - Core documentation testing skill
- `inline-test-injection` - Inject tests into source files

## Resources

- Doc Detective docs: https://doc-detective.com
- Config schema: https://doc-detective.com/docs/references/schemas/config
- Actions reference: https://doc-detective.com/docs/category/actions
