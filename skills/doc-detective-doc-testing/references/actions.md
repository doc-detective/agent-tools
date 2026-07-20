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

**Open a new tab or window**:

`goTo` is the only action that opens browser tabs and windows. Set `newTab` or `newWindow` to open the URL in a fresh surface and name it so later steps can target it. Each accepts `true` for an anonymous surface, a string to name it, or an object. `newTab` and `newWindow` are mutually exclusive, and neither can be combined with a conflicting [`surface`](#browser-windows-and-tabs) selector.

```json
{ "goTo": { "url": "https://example.com/cart", "newTab": "cart" } }
```

```json
{
  "goTo": {
    "url": "https://example.com/admin",
    "newWindow": { "name": "admin", "tab": "overview" }
  }
}
```

**Opener options:**
- `newTab`: `true` (anonymous tab), a string (tab name), or `{ "name": "<name>" }`. Opens the URL in a new tab.
- `newWindow`: `true` (anonymous window), a string (window name), or `{ "name": "<name>", "tab": "<name>" }` where `tab` names the window's first tab. Opens the URL in a new window.
- `surface`: With `newTab`, selects the existing window the new tab opens in. Without an opener, addresses an existing window/tab (see [Browser windows and tabs](#browser-windows-and-tabs)).

---

## Browser windows and tabs

Most browser steps — `goTo`, `click`, `find`, `dragAndDrop`, `runBrowserScript`, `record`, `screenshot`, `type`, and `closeSurface` — accept a `surface` that targets a specific window or tab instead of the active one. The targeted tab is focused before the step runs and stays focused afterward. Omit `surface` to keep the default behavior — the step acts on the active tab. A tab given without a window is searched for across every tab in the browser in creation order, including tabs the page opened itself through `target="_blank"` or `window.open`.

A browser `surface` is an object with a required `browser` plus an optional `window` and/or `tab` selector:

```json
{ "click": { "selector": "button.primary", "surface": { "browser": "chrome", "tab": "cart" } } }
```

```json
{ "find": { "selector": "#status", "surface": { "browser": "chrome", "window": "admin", "tab": -1 } } }
```

**Surface fields:**
- `browser`: Required. One of `"chrome"`, `"firefox"`, `"safari"`, `"webkit"`, `"edge"`. Must be the browser already driving the context — targeting a different browser fails with a message (multi-browser support lands in a later phase).
- `window` / `tab`: Optional window or tab selector. Omit `window` to use the active window; omit `tab` to use the active tab.

**Window/tab selectors** accept any of these forms:
- **Name** — the string name assigned when the surface was opened: `"cart"`.
- **Index** — an integer in creation order; negative counts from the end, so `-1` is the newest: `-1`.
- **Criteria** — an object matching any of `name`, `index`, `title`, or `url`. `title` and `url` match as a substring, or as a `/regex/` wrapped in forward slashes: `{ "title": "/Checkout/" }`.

**Phase limits (fail with guidance):** a `browser` that isn't the active browser, a browser surface `name` (reserved), closing a whole browser, and closing the last open tab all fail with a message rather than silently doing nothing. The same specs start working when multi-browser support ships.

---

## Native app surfaces (Windows and macOS)

`startSurface` launches a native desktop app and registers it as an automation surface. Once you set `surface` to `{ "app": "<name>" }`, the element steps you already use in the browser — `find`, `click`, `type`, `screenshot`, and `waitUntil` — can drive it. Close the app with a [`closeSurface`](#closesurface) step. Native app surfaces run on **Windows and macOS**; on any other platform the context is marked SKIPPED (not failed) with an actionable reason. The driver for each platform installs automatically the first time you use it. On macOS, the process that runs Doc Detective also needs the Accessibility permission — see [macOS Accessibility permission](#macos-accessibility-permission).

### startSurface

Launch an app and register it under a name that later steps can target.

```json
{ "startSurface": { "app": "C:\\Windows\\System32\\charmap.exe" } }
```

```json
{
  "startSurface": {
    "app": "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App",
    "name": "calc",
    "waitUntil": { "delayMs": 500 },
    "timeout": 30000
  }
}
```

On macOS, launch by bundle ID or by `.app` path:

```json
{ "startSurface": { "app": "com.apple.TextEdit", "name": "textedit" } }
```

```json
{ "startSurface": { "app": "/System/Applications/Calculator.app", "name": "calc" } }
```

**Options:**
- `app`: Required. The app to launch — on Windows, an executable path, package name, or UWP AppUserModelID; on macOS, a `.app` path or a bundle ID (`com.apple.TextEdit`). The kind is inferred from the value's syntax; there is no separate type field.
- `name`: The surface name later steps reference in `surface`. Defaults to the executable's basename (without extension) or the final segment of an ID.
- `args`: Launch arguments. On macOS they pass to the app as a real argument array; on Windows they join into a single shell-style string, so an argument that contains spaces must carry its own quotes (for example, `"\"My File.txt\""`).
- `workingDirectory`: Directory to launch from (Windows only; default `"."`). Not supported on macOS, where the driver launches apps through LaunchServices and has no working-directory control, so a non-default value fails there with guidance — launch through `runShell` if the cwd matters.
- `env`: Extra environment variables for the launched app. Supported on macOS; rejected by the Windows driver, where any value fails with guidance — set the variables in the shell that launches Doc Detective, or launch through `runShell` instead.
- `waitUntil`: Startup readiness gate — `{ delayMs?: number, find?: object }`. `delayMs` waits a fixed time; `find` waits for an element to appear.
- `timeout`: Maximum time in ms to wait for startup (default `60000`). The first macOS launch builds the driver's helper app and can take a few minutes, so allow extra time there.
- `driverOptions`: Object of driver capability overrides passed through to the underlying driver (for example, `appium:noReset`).

The mobile-oriented fields `install`, `activity`, and `device` are accepted by the schema but reserved for later mobile support — setting any of them fails the step with a message pointing to the roadmap. Leave them unset.

### Targeting elements on an app surface

Element steps target an app through `surface`, the same way they target a browser tab, but the value is `{ "app": "<name>" }`. The element-finding fields keep the names you already use; on an app surface they map to the platform's native accessibility tree instead of the DOM.

On **Windows** (UI Automation):
- `elementText` matches the element's `Name`.
- `elementId` (and `elementTestId`) match its `AutomationId`.
- `elementAria` matches its UIA `ControlType`.

On **macOS** (accessibility):
- `elementText` matches the element's title, label, or value.
- `elementId` (and `elementTestId`) match its accessibility identifier.
- `elementAria` matches its `XCUIElementType` role (for example, `button` → `XCUIElementTypeButton`, `textbox` → `XCUIElementTypeTextField`) together with its accessible name (title or label). Pass it as a role string; the `{ role, name }` object form isn't reachable through the schema yet.

On both platforms:
- `selector` is an escape hatch for native locators: a native XPath (starting with `//` or `(`), or an accessibility id (starting with `~`). CSS selectors are browser-only and are rejected on app surfaces.
- `elementClass` and `elementAttribute` are not supported on app surfaces.

```json
{ "click": { "elementText": "Select", "surface": { "app": "charmap" } } }
```

```json
{
  "type": {
    "keys": ["AB"],
    "selector": "//Edit[@Name=\"Characters to copy :\"]",
    "surface": { "app": "charmap" }
  }
}
```

```json
{ "click": { "elementText": "7", "surface": { "app": "calc" } } }
```

```json
{ "screenshot": { "path": "charmap.png", "surface": { "app": "charmap" } } }
```

**App surface fields:**
- `app`: Required. The `name` from `startSurface` (or its derived default).
- `window`: The schema accepts a `window` selector on an app surface, but per-window targeting isn't active in this phase — a step that sets it fails, so omit `window` and act on the app's active window. Window selection lands in a later part of the native app roadmap.

Gate app tests to the platforms they support so the skip elsewhere is intentional — for example, set `runOn` platforms to `["windows"]` for a Windows app or `["mac"]` for a macOS app.

### macOS Accessibility permission

macOS won't let one app control another until you grant the controlling process the Accessibility permission (part of the system's Transparency, Consent, and Control, or TCC). Doc Detective checks for it before launching an app surface: if the permission is clearly denied, the context is marked SKIPPED (not failed) with the walkthrough below; if the check is inconclusive, the run proceeds, and any accessibility-related launch error carries the same walkthrough. To grant it:

> Open System Settings → Privacy & Security → Accessibility and enable the app that launches Doc Detective (your terminal, IDE, or CI runner process), then rerun.

The process you enable is whichever one runs Doc Detective — your terminal, your IDE, or the CI runner's shell — not the app being automated.

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
- `$ARROW_UP$`, `$ARROW_DOWN$`, `$ARROW_LEFT$`, `$ARROW_RIGHT$` - Arrow keys
- `$HOME$`, `$END$` - Home/End
- `$PAGE_UP$`, `$PAGE_DOWN$` - Page Up/Down
- `$CTRL$`, `$SHIFT$`, `$ALT$`, `$COMMAND$` - Modifier keys
- `$SPACE$` - Space
- `$F1$` through `$F12$` - Function keys
- `$INSERT$` - Insert
- `$SUBTRACT$` - Numpad subtract

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

**Type into a specific browser tab**:

Set `surface` to a browser window or tab to type into a field there (see [Browser windows and tabs](#browser-windows-and-tabs)). After typing, an optional `waitUntil` holds the step until the tab is ready, and `timeout` bounds that wait. For a browser surface, `waitUntil` accepts `networkIdleTime`, `domIdleTime`, and/or `find` (an element to wait for); for a process surface it accepts `stdio` and/or `delayMs`.

```json
{
  "type": {
    "keys": ["kittens", "$ENTER$"],
    "selector": "#search",
    "surface": { "browser": "chrome", "tab": "cart" },
    "waitUntil": { "find": { "selector": ".results" } },
    "timeout": 10000
  }
}
```

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
    "stdio": "v22"
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

Close one or more open surfaces — background processes started by `runShell` or `runCode`, browser tabs and windows, or a [native app](#native-app-surfaces-windows-and-macos). Target a process or app by its registered name, or a browser tab or window with a [browser surface](#browser-windows-and-tabs). Pass an array to close several at once. Closing a surface that isn't open — already closed, or never opened — is a no-op that passes, so `closeSurface` is safe to call unconditionally. Surfaces you never close explicitly are torn down automatically when the run ends.

Close a background process by name:

```json
{ "closeSurface": "web" }
```

```json
{ "closeSurface": ["web", "api"] }
```

Close a browser tab (`tab`) or window and all its tabs (`window`):

```json
{ "closeSurface": { "browser": "chrome", "tab": "cart" } }
```

```json
{ "closeSurface": { "browser": "chrome", "window": "admin" } }
```

Close a [native app](#native-app-surfaces-windows-and-macos) by its surface name:

```json
{ "closeSurface": { "app": "charmap" } }
```

Doc Detective refuses to close the last open tab, which would end the browser session, and refuses to close a whole browser; both fail with a message.

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
