# Doc Detective Actions Reference

Quick reference for all Doc Detective actions. For comprehensive documentation, see https://docs.doc-detective.com/docs/get-started/concepts#action.

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
- `elementText`: Find the element by its display text (the object-form equivalent of the string shorthand, as in `{ "find": { "elementText": "Welcome" } }`)
- `elementAria`: Find the element by its computed accessible name
- `selector`: CSS selector
- `timeout`: Wait time in ms
- `click`: Click after finding. Set `true`, or an object with `duration` (long-press hold in ms) and/or `button` (`"left"` | `"right"` | `"middle"`)
- `moveTo`: Move cursor to element before interacting (boolean)
- `type`: Type text after finding (object with `keys`)
- `matchText`: After finding, assert the element *contains* this text (substring match; also accepts a `/regex/`)

**Text matching:** When you find an element by text — the `{ "find": "Welcome" }` shorthand or the `elementText` field — the match is against the element's *whole* visible text with whitespace normalized: leading and trailing whitespace is trimmed, and internal runs of spaces, tabs, and newlines collapse to a single space.

- **Whole-element exact match, not a substring.** A broad target with `elementText` won't match a nested heading, because the container's full text is more than the heading alone. To match a substring instead, wrap the value in slashes to use a regular expression, as in `{ "find": { "elementText": "/Garden companion/" } }`.
- **Split text still matches.** Text that a framework such as React, Vue, or Svelte splits across several DOM text nodes still matches, and the result is the same on Chrome and Firefox regardless of how each browser's driver reports whitespace.
- **Same rules elsewhere.** The same normalization applies to `elementAria` and to a selector's matched text.
- **`matchText` is separate.** `matchText` asserts against an already-found element with a substring check and is unaffected.

On mobile app surfaces, `find` scrolls the surface down to bring an off-screen element into view. It scrolls downward only, up to five times within the step's `timeout`. `click` and element-targeted `type` inherit this because they find the element first. Desktop app surfaces don't scroll, since their accessibility trees expose off-screen elements directly.

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

Scroll or swipe a surface. Works on browser and app surfaces, including mobile apps. `swipe` is the movement-only counterpart to `dragAndDrop`. Where `dragAndDrop` moves an element onto a target element, `swipe` moves the surface itself, by direction or between two pixel points.

**Direction shorthand.** A string names the direction the finger moves. `"up"` moves content up to reveal what's below; `"left"` reveals content to the right (the next carousel card):

```json
{ "swipe": "up" }
```

**Directional with distance.** `distance` is a fraction of the surface's height (`up`/`down`) or width (`left`/`right`):

```json
{
  "swipe": {
    "direction": "up",
    "distance": 0.8,
    "surface": { "app": "myapp" }
  }
}
```

**Point-to-point.** Drag from one pixel coordinate to another. Points are literal pixels measured from the top-left corner (`0, 0`) of the app window or the browser viewport:

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
- `surface`: Target a specific app surface, browser window, or tab instead of the active one. Object form only; the `"up"` string shorthand always swipes the active surface.

Use `direction` (with `distance`) or `from`/`to`, never both. Prefer the directional form, whose fractional `distance` works at any resolution. Use the point-to-point form, in absolute pixels, only when you need a precise gesture path.

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

#### Mobile device keys

On a mobile app surface, `type` also presses the device's own buttons. These device keys don't need element criteria, so send them on their own:

```json
{ "type": "$BACK$" }
```

This example is Android-only: iOS rejects `$BACK$`, as the platform notes below explain.

- `$BACK$` - System back button
- `$HOME$` - Device home button
- `$APP_SWITCH$` - App switcher / recents
- `$VOLUME_UP$`, `$VOLUME_DOWN$` - Volume buttons

On a mobile app surface, `$HOME$` presses the device home button. In a browser or desktop text field, it still moves the cursor to the start of the line.

Typing plain text and editing keys works differently on each platform:

- **Android** types criteria-less text into the currently focused element, so you can send `{ "type": "search text" }` right after focusing a field. It maps the editing keys above to device key events and accepts `$BACK$`, `$HOME$`, `$APP_SWITCH$`, and the volume keys.
- **iOS** still requires element criteria to type text. Target the field with `elementText` (or another locator) and pass `keys`, which takes a string or an array of strings. iOS folds `$ENTER$`, `$TAB$`, `$BACKSPACE$`, and `$DELETE$` into the typed text and presses `$HOME$` and the volume keys as physical buttons. It rejects `$BACK$`, because iOS has no system back button, so click the app's own back control instead. It also rejects `$APP_SWITCH$`, because XCUITest exposes no app-switcher button.

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
- `args`: Array of string arguments for the command (default: `[]`)
- `exitCodes`: Expected exit codes (default: `[0]`). The step fails if the actual exit code is not in this list.
- `stdio`: Expected content in the command's **stdout or stderr** (partial match). Plain string, or a `/regex/` delimited by forward slashes.
- `workingDirectory`: Directory to run the command in (default `"."`, relative to where Doc Detective is invoked)
- `timeout`: Max time in milliseconds the command is allowed to run before the step fails (default: `60000`)

These fields capture the command's output to a file and compare it against the saved copy on later runs (a snapshot test):
- `path`: File path to save the command's output, relative to `directory`. Use an extension that matches the output, such as `.txt` for plain text or `.json` for JSON.
- `directory`: Directory to save the output in. Created if it doesn't exist; defaults to your media directory.
- `maxVariation`: Allowed fraction of text difference (0–1) between the current output and the previously saved output. A larger difference makes the step a `WARNING`, not a `FAIL`. Ignored when no saved output exists at `path` yet. (default: `0`)
- `overwrite`: When to replace the saved output: `"true"` (always), `"false"` (never), or `"aboveVariation"` (only when the difference exceeds `maxVariation`). Note these are **strings**, not booleans. (default: `"aboveVariation"`)

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
