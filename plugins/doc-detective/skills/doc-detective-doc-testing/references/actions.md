# Doc Detective Actions Reference

Quick reference for all Doc Detective actions. For comprehensive documentation, see https://doc-detective.com/docs/category/actions.

## Navigation & Browser

### goTo

Navigate to a URL.

```json
{ "goTo": "https://example.com" }
```

With options:

```json
{
  "goTo": {
    "url": "https://example.com",
    "waitUntil": "networkidle"
  }
}
```

**Options:**
- `waitUntil`: `"load"` | `"domcontentloaded"` | `"networkidle"` | `"commit"`

---

## Element Interaction

### click

Click or tap an element.

**Preferred: Text-based** (matches visible text):

```json
{ "click": "Submit" }
```

**Selector-based** (when text matching is insufficient):

```json
{ "click": { "selector": "button.primary" } }
```

### find

Check if an element exists. Can optionally interact with it.

**Preferred: Text-based**:

```json
{ "find": "Welcome" }
```

**Selector-based with options**:

```json
{
  "find": {
    "selector": "#main-content",
    "timeout": 5000
  }
}
```

**Find and click**:

```json
{
  "find": {
    "selector": "button.submit",
    "click": true
  }
}
```

**Find and match text**:

```json
{
  "find": {
    "selector": ".status",
    "matchText": "Success"
  }
}
```

**Composite find (click and type in one step)**:

```json
{
  "find": {
    "selector": "#search-input",
    "click": true,
    "type": {
      "keys": ["search query", "$ENTER$"]
    }
  }
}
```

**Options:**
- `selector`: CSS selector
- `timeout`: Wait time in ms
- `click`: Click after finding (boolean)
- `moveTo`: Move cursor to element before interacting (boolean)
- `type`: Type text after finding (object with `keys`)
- `matchText`: Verify element contains text

### dragAndDrop

Drag element from source to target.

```json
{
  "dragAndDrop": {
    "sourceSelector": "#draggable",
    "targetSelector": "#droppable"
  }
}
```

---

## Form Input

### type

Type text into an element. Supports special keys.

**Basic typing**:

```json
{
  "type": {
    "keys": "hello@example.com",
    "selector": "#email"
  }
}
```

**With special keys**:

```json
{
  "type": {
    "keys": "search query$ENTER$",
    "selector": "#search"
  }
}
```

**Special key codes:**
- `$ENTER$` - Enter/Return
- `$TAB$` - Tab
- `$ESCAPE$` - Escape
- `$BACKSPACE$` - Backspace
- `$DELETE$` - Delete
- `$ARROWUP$`, `$ARROWDOWN$`, `$ARROWLEFT$`, `$ARROWRIGHT$` - Arrow keys
- `$HOME$`, `$END$` - Home/End
- `$PAGEUP$`, `$PAGEDOWN$` - Page Up/Down

---

## Verification

### checkLink

Verify a URL returns an acceptable HTTP status code.

```json
{ "checkLink": "https://example.com/api/health" }
```

With options:

```json
{
  "checkLink": {
    "url": "https://example.com/api",
    "statusCodes": [200, 201, 204]
  }
}
```

**Options:**
- `url`: URL to check
- `statusCodes`: Array of acceptable status codes (default: 200-299)

---

## HTTP Requests

### httpRequest

Perform HTTP requests for API testing.

**GET request**:

```json
{
  "httpRequest": {
    "url": "https://api.example.com/users",
    "method": "GET"
  }
}
```

**POST with body**:

```json
{
  "httpRequest": {
    "url": "https://api.example.com/users",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "name": "Test User",
      "email": "test@example.com"
    }
  }
}
```

**With response validation**:

```json
{
  "httpRequest": {
    "url": "https://api.example.com/status",
    "method": "GET",
    "statusCodes": [200],
    "responseHeaders": {
      "content-type": "application/json"
    },
    "responseBody": {
      "status": "healthy"
    }
  }
}
```

**Options:**
- `url`: Request URL
- `method`: `"GET"` | `"POST"` | `"PUT"` | `"PATCH"` | `"DELETE"`
- `headers`: Request headers object
- `body`: Request body (object or string)
- `statusCodes`: Expected status codes
- `responseHeaders`: Expected response headers
- `responseBody`: Expected response body (partial match)
- `timeout`: Request timeout in ms

---

## Shell & Code Execution

### runShell

Execute native shell commands.

```json
{
  "runShell": {
    "command": "echo 'Hello World'"
  }
}
```

With exit code validation:

```json
{
  "runShell": {
    "command": "npm test",
    "exitCodes": [0]
  }
}
```

With output matching (`stdio` matches against **stdout OR stderr** — there is no separate `stdout`/`stderr` field):

```json
{
  "runShell": {
    "command": "node --version",
    "stdio": "v18"
  }
}
```

`stdio` also accepts a regular expression — wrap the pattern in forward slashes:

```json
{
  "runShell": {
    "command": "node --version",
    "stdio": "/^v\\d+\\./"
  }
}
```

**Options** (the object form is strict: `additionalProperties: false`, so an unknown key — e.g. `stdout` — makes the whole spec invalid and Doc Detective silently skips it):
- `command`: Shell command to execute (required)
- `args`: Array of string arguments for the command
- `exitCodes`: Expected exit codes (default: `[0]`). The step fails if the actual exit code is not in this list.
- `stdio`: Expected content in the command's **stdout or stderr** (partial match). Plain string, or a `/regex/` delimited by forward slashes.
- `workingDirectory`: Directory to run the command in (default `"."`, relative to where Doc Detective is invoked)
- `path` / `directory`: Save the command's output to a file for later comparison

### runCode

Assemble and run code snippets.

```json
{
  "runCode": {
    "language": "javascript",
    "code": "console.log('Hello');"
  }
}
```

---

## Media Capture

### screenshot

Take a PNG screenshot.

```json
{ "screenshot": "login-page.png" }
```

With options:

```json
{
  "screenshot": {
    "path": "screenshots/dashboard.png",
    "fullPage": true
  }
}
```

**Options:**
- `path`: Output file path
- `fullPage`: Capture entire scrollable page (boolean)
- `selector`: Capture specific element only

### record / stopRecord

Record video of test execution.

Start recording:

```json
{ "record": "test-execution.webm" }
```

Stop recording:

```json
{ "stopRecord": true }
```

---

## Session Management

### loadVariables

Load environment variables from a .env file.

```json
{ "loadVariables": ".env" }
```

```json
{ "loadVariables": "config/doc-detective-test.env" }
```

### saveCookie / loadCookie

Manage browser cookies for session persistence.

Save cookies:

```json
{ "saveCookie": "session-cookies.json" }
```

Load cookies:

```json
{ "loadCookie": "session-cookies.json" }
```

---

## Utilities

### wait

Pause test execution.

Fixed duration:

```json
{ "wait": 2000 }
```

Wait for element:

```json
{
  "wait": {
    "selector": ".loading",
    "state": "hidden"
  }
}
```

**Options:**
- Duration in ms (number)
- Or object with:
  - `selector`: Element to wait for
  - `state`: `"visible"` | `"hidden"` | `"attached"` | `"detached"`
  - `timeout`: Max wait time in ms

---

## Step Routing

Attach routing handlers to a step to control what runs next based on its outcome. Each handler is an array of routing entries, and Doc Detective evaluates the handler that matches the step's result:

- `onPass` — after the step passes
- `onFail` — after the step fails
- `onWarning` — after the step produces a warning
- `onSkip` — after the step is reached but skipped (blocked as `unsafe`, or its guard `if` evaluated false)

Each entry pairs an optional `if` condition with exactly one routing action (`continue`, `stop`, `retry`, or `goToStep`). The first entry whose condition holds wins; an entry with no `if` always matches. If no entry matches, the step's status default applies.

Routing is opt-in. A step with no handlers uses the defaults, which reproduce today's behavior exactly: `PASS`, `WARNING`, and `SKIPPED` continue to the next step, and `FAIL` stops the test.

Routing chooses flow, not the verdict. A step that fails still reports `FAIL` and still fails the test even when its `onFail` handler routes `continue`. Later steps run, but the rolled-up result stays failed.

A handler fires only if the step was reached. A step that never ran because an earlier step stopped execution fires no handler.

### continue and stop

- `continue` — proceed to the next step. Use it to override a status default, for example to keep going after a failure.
- `stop` — halt execution at the given scope. `stop: test` ends the current test's remaining steps. `stop: spec` ends the spec's remaining tests; `stop: run` currently behaves as `stop: spec`.

```json
{
  "stepId": "optional-check",
  "find": "Beta banner",
  "onFail": [
    { "continue": true }
  ]
}
```

### retry

A `retry` entry re-runs the step until it no longer routes `retry` or the retry limit is hit. Each attempt re-runs the whole step, so a transient failure can recover to `PASS`.

```json
{
  "runShell": { "command": "curl -sf https://example.com/health" },
  "onFail": [
    { "retry": { "limit": 3, "delay": 1000, "backoff": "exponential" } }
  ]
}
```

**Options:**
- `limit`: Number of retries (1–100). This counts re-runs after the first attempt, so `limit + 1` total runs.
- `delay`: Milliseconds to wait before each retry (default `0`).
- `backoff`: `"fixed"` (default) or `"exponential"`.

Once retries are exhausted, Doc Detective re-resolves routing with `retry` entries skipped to find the terminal action. So `onFail: [{ "retry": { "limit": 2 } }]` retries twice and then stops (the `FAIL` default), while `onFail: [{ "retry": { "limit": 1 } }, { "continue": true }]` retries once and then continues. `retry` is a no-op under `onSkip`. When a step is retried, its result carries an additive `attempts` field with the total run count.

### goToStep

A `goToStep` entry jumps execution to another step in the same test and continues from there:

```json
{
  "stepId": "submit",
  "click": "Submit",
  "onFail": [
    { "goToStep": "retry-login" }
  ]
}
```

The target matches by `stepId` within the same test; if two steps share a `stepId`, the first wins. An unknown target is a misconfiguration — Doc Detective records a `FAIL` and stops rather than report green on a typo.

A `goToStep` can point at an earlier step, which re-runs it. Each re-run appends a fresh report stamped with an incrementing `visit` number; the first run omits `visit`. A per-test visit cap bounds loops, so a self-referential jump records a `FAIL` and stops instead of hanging. As with the other handlers, a jump never changes a verdict — a backward jump that re-runs a step which failed on its first visit leaves the test failed.

`goToTest` is also accepted in a step handler and validates, but at step scope it is not yet executed. To jump between tests, use a test-level handler.

---

## Text vs Selector Guidelines

### Use text-based matching (preferred)

| Documentation says | Test step |
|---|---|
| "Click the **Submit** button" | `{ "click": "Submit" }` |
| "Verify **Welcome** appears" | `{ "find": "Welcome" }` |
| "Tap **Next**" | `{ "click": "Next" }` |
| "Look for **Dashboard**" | `{ "find": "Dashboard" }` |

### Use selectors when

- Multiple elements share the same text
- Element has no visible text (icon buttons, images)
- Documentation explicitly provides a CSS selector

```json
{ "click": { "selector": "button[aria-label='Close']" } }
{ "find": { "selector": "#main-content > h1" } }
```
