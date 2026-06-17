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

With output matching:

```json
{
  "runShell": {
    "command": "node --version",
    "stdout": "v18"
  }
}
```

**Options:**
- `command`: Shell command to execute
- `exitCodes`: Expected exit codes (default: [0])
- `stdout`: Expected stdout content (partial match)
- `stderr`: Expected stderr content (partial match)
- `workingDirectory`: Directory to run command in

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

Record video of test execution. Each `record` step must be paired with a later `stopRecord` step.

Start recording:

```json
{ "record": "test-execution.webm" }
```

Stop recording:

```json
{ "stopRecord": true }
```

#### Named and overlapping recordings

A single test context can have more than one recording active at the same time. Give a recording a `name` so that a later `stopRecord` can target it:

```json
{ "record": { "path": "checkout-flow.mp4", "name": "checkout" } }
```

Names must be unique among recordings that are active at the same time. A recording started without a `name` is anonymous.

`stopRecord` decides which recording to stop based on its value:

| Value | Stops |
|-------|-------|
| `true` or `null` | The most recently started active recording (LIFO) |
| `"<name>"` | The named recording, wherever it sits in the active set |
| `{ "name": "<name>" }` | The named recording (object form, equivalent to the string) |

Stop a specific recording by name:

```json
{ "stopRecord": "checkout" }
```

```json
{ "stopRecord": { "name": "checkout" } }
```

Reusing a `name` while a recording by that name is still active is caught before the run starts. The affected test is skipped across all contexts with a warning, rather than failing partway through.

#### Auto-record every context

Set `autoRecord: true` (at the config, spec, or test level, or pass `--auto-record` on the CLI) to automatically record a full video of every browser-based test context, alongside any explicit `record` steps. Precedence runs test > spec > config. The automatic recording wraps the whole context and always uses the `ffmpeg` engine. It lands in the per-run artifact folder at a deterministic path (`recordings/<specId>/<testId>/<contextId>.mp4`), so the same context maps to the same path in every run for run-over-run comparison. An untargeted `stopRecord` never stops the automatic recording; it is finalized only at the end of the context.

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
