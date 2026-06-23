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

**Long-running background process**:

Set `background: true` to start a long-lived process (such as a Docker container, dev server, or database) and keep it running while later steps execute. The step returns as soon as the process is ready rather than waiting for it to exit; stop it later with [`stopProcess`](#stopprocess).

```json
{
  "runShell": {
    "command": "docker run -p 8080:80 nginx",
    "background": true,
    "name": "web",
    "readyWhen": {
      "httpGet": { "url": "http://localhost:8080", "statusCodes": [200] }
    },
    "timeout": 30000
  }
}
```

**Background options:**
- `background`: Start the command as a non-blocking background process (boolean, default `false`)
- `name`: Identifier used to stop the process later. Required when `background` is `true`, and must contain a non-whitespace character.
- `readyWhen`: Probe that determines when the process is ready (see [Readiness probes](#readiness-probes))
- `timeout`: In background mode, the maximum time in ms to wait for `readyWhen` to be satisfied before the step fails (default `60000`)

In background mode, the `exitCodes`, `stdout`/`stderr`, and output-saving options are ignored.

#### Readiness probes

When `background` is `true`, `readyWhen` holds the step until the process is ready. Provide exactly one probe:

**`port`** — wait for a TCP port to accept connections:

```json
{ "readyWhen": { "port": { "port": 8080, "host": "127.0.0.1", "pollIntervalMs": 500 } } }
```

**`httpGet`** — wait for an HTTP endpoint to return an accepted status:

```json
{ "readyWhen": { "httpGet": { "url": "http://localhost:8080", "statusCodes": [200], "pollIntervalMs": 500 } } }
```

**`log`** — wait for output to match a regular expression:

```json
{ "readyWhen": { "log": { "pattern": "Server listening on", "stream": "any" } } }
```

**`delayMs`** — wait a fixed number of milliseconds:

```json
{ "readyWhen": { "delayMs": 2000 } }
```

**Probe options:**
- `port`: `port` (1–65535, required), `host` (default `"127.0.0.1"`), `pollIntervalMs` (default `500`)
- `httpGet`: `url` (required), `statusCodes` (default `[200]`), `pollIntervalMs` (default `500`)
- `log`: `pattern` (regular expression source, no surrounding slashes, required), `stream` (`"stdout"` | `"stderr"` | `"any"`, default `"any"`)
- `delayMs`: Number of milliseconds (integer, minimum `0`)

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

For long-running processes, `runCode` accepts the same `background`, `name`, `readyWhen`, and `timeout` options as `runShell`:

```json
{
  "runCode": {
    "language": "javascript",
    "code": "require('http').createServer((req, res) => res.end('ok')).listen(8088);",
    "background": true,
    "name": "api",
    "readyWhen": { "port": { "port": 8088 } },
    "timeout": 15000
  }
}
```

### stopProcess

Stop a background process started by `runShell` or `runCode` with `background: true`. Reference it by the `name` it was registered under.

```json
{ "stopProcess": "web" }
```

With options:

```json
{ "stopProcess": { "name": "web", "ignoreMissing": true } }
```

**Options:**
- `name`: Name of the background process to stop (required in object form, must contain a non-whitespace character)
- `ignoreMissing`: When `true`, the step passes even if no process with that name is registered (boolean, default `false`)

Background processes that are never explicitly stopped are torn down automatically when the run ends.

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
