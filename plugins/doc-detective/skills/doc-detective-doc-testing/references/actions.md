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

**Type to a background process**:

The `type` step can also send keystrokes to a running background process — for example, to drive an interactive REPL or CLI such as `node -i` or `python -i`. Instead of targeting an element, set `surface` to the process name (or to `{ "process": "<name>" }`) of a process started by `runShell`/`runCode` with `background`. After sending the keys, an optional `waitUntil` holds the step until the process output matches, and `timeout` bounds that wait.

```json
{
  "type": {
    "keys": ["6 * 7", "$ENTER$"],
    "surface": "repl",
    "waitUntil": { "stdio": "/^42$/" },
    "timeout": 5000
  }
}
```

**Process surface options:**
- `surface`: Name of the target process, or `{ "process": "<name>" }`. A process surface can't be combined with element-finding fields like `selector`.
- `waitUntil`: After the keys are sent, wait until the process is ready. Accepts `stdio` (substring or `/regex/` matched against combined stdout and stderr) and/or `delayMs` (fixed wait). Requires a `surface`.
- `timeout`: Maximum time in ms to wait for `waitUntil` after sending the keys (default `5000`)
- `inputDelay`: Delay in ms between each keystroke sent to the process (default `100`)

Process surfaces use their own special-key tokens, which differ from the element key codes above:

```json
{ "type": { "keys": ["$CTRL$", "c"], "surface": { "process": "repl" } } }
```

**Process key tokens:**
- `$ENTER$` / `$RETURN$` - Carriage return
- `$TAB$` - Tab
- `$ESCAPE$` - Escape
- `$BACKSPACE$` - Backspace
- `$SPACE$` - Space
- `$DELETE$` - Delete
- `$ARROW_UP$`, `$ARROW_DOWN$`, `$ARROW_LEFT$`, `$ARROW_RIGHT$` - Arrow keys (ANSI escape sequences)
- `$CTRL$` followed by a letter in the next array element sends that control byte (for example, `["$CTRL$", "c"]` sends `Ctrl+C`)

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

**Long-running background process**:

Set `background` to start a long-lived process — such as a Docker container, dev server, or database — and keep it running while later steps execute. The step returns as soon as the process is ready rather than waiting for it to exit; stop it later with a [`closeSurface`](#closesurface) step. `background` is an object with a required `name`, which later `type` and `closeSurface` steps use to target the process, plus an optional `waitUntil` readiness gate. When `background` is set, the `exitCodes`, `stdout`/`stderr`, and output-saving options are ignored, and `timeout` instead bounds how long the step waits for `waitUntil`.

```json
{
  "runShell": {
    "command": "docker run -p 8080:80 nginx",
    "background": {
      "name": "web",
      "waitUntil": {
        "httpGet": "http://localhost:8080"
      }
    },
    "timeout": 30000
  }
}
```

**Background options:**
- `background`: An object with a required `name` and an optional `waitUntil`
- `name`: Unique process name within the run (non-empty), used to target it from a later `type` or `closeSurface` step
- `waitUntil`: One or more readiness conditions that hold the step until the process is ready (see [Readiness conditions](#readiness-conditions)). Omit it to treat the process as ready as soon as it spawns.
- `timeout`: In background mode, the maximum time in ms to wait for `waitUntil` to be satisfied before the step fails (default `60000`)

#### Readiness conditions

`waitUntil` holds the step until the process is ready. Provide any combination of the conditions below; the step proceeds only once every condition you include passes before `timeout` (they are AND-combined).

**`port`** — wait for a TCP port to accept connections on localhost:

```json
{ "waitUntil": { "port": 8080 } }
```

**`httpGet`** — wait for an HTTP GET to a URL to return a 2xx status:

```json
{ "waitUntil": { "httpGet": "http://localhost:8080/health" } }
```

**`stdio`** — wait for output to match, searched across both stdout and stderr:

```json
{ "waitUntil": { "stdio": "/ready to accept/" } }
```

**`delayMs`** — wait a fixed number of milliseconds:

```json
{ "waitUntil": { "delayMs": 2000 } }
```

**Combine conditions** — the step is ready only once all of them pass:

```json
{
  "waitUntil": {
    "port": 5432,
    "stdio": "/ready to accept/",
    "httpGet": "http://localhost:8080/health",
    "delayMs": 1000
  }
}
```

**Condition options:**
- `port`: TCP port (integer, 1–65535); ready once the port accepts connections on localhost
- `httpGet`: URL string; ready once an HTTP GET to it returns a 2xx status
- `stdio`: A substring, or a `/regex/` (wrapped in slashes), matched against the process's combined stdout and stderr (string, non-empty)
- `delayMs`: Number of milliseconds to wait (integer, minimum `0`)

Provide at least one condition; an empty `waitUntil` is rejected.

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

For long-running processes, `runCode` accepts the same `background` and `timeout` options as `runShell`:

```json
{
  "runCode": {
    "language": "javascript",
    "code": "require('http').createServer((req, res) => res.end('ok')).listen(8088);",
    "background": { "name": "api", "waitUntil": { "port": 8088 } },
    "timeout": 15000
  }
}
```

### closeSurface

Stop one or more background processes started by `runShell` or `runCode`. Target a process by the name it was registered under, or pass an array to close several at once. Closing a surface that isn't open — already stopped, or never started — is a no-op that passes, so `closeSurface` is safe to call unconditionally. Background processes you never close explicitly are torn down automatically when the run ends.

```json
{ "closeSurface": "web" }
```

```json
{ "closeSurface": ["web", "api"] }
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
