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

**Long-press / press-and-hold** (`duration` in ms):

```json
{ "click": { "elementText": "Save", "duration": 800 } }
```

`duration` holds the press: a long-press (touch-and-hold) on mobile app surfaces, and press-and-hold of the button on desktop apps and browsers. Omit it for a normal click.

**Right- or middle-click** (`button`):

```json
{ "click": { "selector": "#menu", "button": "right" } }
```

**Options:**
- `selector` / `elementText` (and the other element locators): the element to click
- `duration`: hold time in ms for a long-press or press-and-hold (integer ≥ 1; omit for a normal click)
- `button`: `"left"` (default) | `"right"` | `"middle"`
- `surface`: target a specific app surface, browser window, or tab instead of the active one

A long-press uses the primary button, so combining `duration` with a non-`left` `button` fails the step. Touch surfaces (Android and iOS) have no right or middle button, and macOS app surfaces support `right` but not `middle`.

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

**Find and long-press** (pass an object to `click` to set `duration` or `button`):

```json
{
  "find": {
    "elementText": "List item",
    "click": { "duration": 800 }
  }
}
```

**Options:**
- `selector`: CSS selector
- `timeout`: Wait time in ms
- `click`: Click after finding — `true`, or an object with `duration` (long-press hold in ms) and/or `button` (`"left"` | `"right"` | `"middle"`)
- `moveTo`: Move cursor to element before interacting (boolean)
- `type`: Type text after finding (object with `keys`)
- `matchText`: Verify element contains text

On mobile app surfaces, `find` scrolls the surface down to bring an off-screen element into view — up to five bounded scrolls within the step's `timeout`, downward only. `click` and element-targeted `type` inherit this because they find the element first. Desktop app surfaces don't scroll, since their accessibility trees expose off-screen elements directly.

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

`dragAndDrop` moves one element onto another. To scroll or swipe a surface without a target element, use [`swipe`](#swipe).

### swipe

Scroll or swipe a surface. Works on browser and app surfaces, including mobile apps. `swipe` is the movement-only counterpart to `dragAndDrop`: where `dragAndDrop` moves an element onto a target element, `swipe` moves the surface itself, either by direction or between two pixel points.

**Direction shorthand** — a string names the direction the finger moves. `"up"` moves content up to reveal what's below; `"left"` reveals content to the right (the next carousel card):

```json
{ "swipe": "up" }
```

**Directional with distance** — `distance` is a fraction of the surface's height (`up`/`down`) or width (`left`/`right`):

```json
{
  "swipe": {
    "direction": "up",
    "distance": 0.8,
    "surface": { "app": "myapp" }
  }
}
```

**Point-to-point** — drag from one pixel coordinate to another. Points are literal pixels measured from the surface's top-left corner (`0, 0`) — the app window or the browser viewport:

```json
{
  "swipe": {
    "from": { "x": 200, "y": 600 },
    "to": { "x": 200, "y": 200 },
    "duration": 250
  }
}
```

**Options:**
- `direction`: `"up"` | `"down"` | `"left"` | `"right"` (required for the directional form)
- `distance`: Fraction of the surface to travel, greater than `0` up to `1` (default `0.5`)
- `from` / `to`: Start and end points as `{ "x": <px>, "y": <px> }`, both required for the point-to-point form (pixels from the top-left corner)
- `duration`: Movement time in ms (integer ≥ 1; default `500`)
- `surface`: Target a specific app surface, browser window, or tab instead of the active one

Use `direction` (with `distance`) or `from`/`to`, never both — the directional and point-to-point forms are mutually exclusive. Prefer the directional form (fractional `distance`) for resilient, resolution-independent scrolling, and reach for the point-to-point form (absolute pixels) only when you need a precise gesture path.

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

#### Mobile device keys

On a mobile app surface, `type` also presses the device's own buttons. These device keys don't need element criteria — send them on their own:

```json
{ "type": "$BACK$" }
```

- `$BACK$` - System back button
- `$HOME$` - Device home button
- `$APP_SWITCH$` - App switcher / recents
- `$VOLUME_UP$`, `$VOLUME_DOWN$` - Volume buttons

`$HOME$` is overloaded: on a mobile app surface it presses the device home button, while in a browser or desktop text field it still moves the cursor to the start of the line.

Typing plain text and editing keys works differently on each platform:

- **Android** types criteria-less text into the currently focused element, so you can send `{ "type": "search text" }` right after focusing a field. It maps the editing keys above to device key events and accepts `$BACK$`, `$HOME$`, `$APP_SWITCH$`, and the volume keys.
- **iOS** still requires element criteria to type text — target the field with `elementText` (or another locator) and pass `keys`. It folds `$ENTER$`, `$TAB$`, `$BACKSPACE$`, and `$DELETE$` into the typed text, presses `$HOME$` and the volume keys as physical buttons, but rejects `$BACK$` (iOS has no system back button — click the app's own back control) and `$APP_SWITCH$` (XCUITest exposes no app-switcher button).

```json
{
  "type": {
    "keys": ["search text", "$ENTER$"],
    "elementText": "Search field"
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
