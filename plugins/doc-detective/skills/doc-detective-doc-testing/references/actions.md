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

### annotate

Draw annotations onto the page so they persist across steps, survive navigation, and appear in any recordings and screenshots taken while they're visible. Unlike a screenshot's own `annotations`, which last only for that capture, these stay on screen until an `annotate` step clears them, their `duration` elapses, or the context ends. Browser only: on an app-only context with no page to draw into, the step is skipped rather than failed.

The value is an object with **at least one** of `add`, `update`, or `clear`:

```json
{ "annotate": { "add": [{ "outline": "#submit-button" }] } }
```

```json
{ "annotate": { "clear": true } }
```

- `add`: Array of annotation objects to draw. Give an annotation an `id` to update or clear it later; adding one with an id already on screen replaces it.
- `update`: Array of annotation objects to change, each matched by `id` (`id` is required on every entry). Each entry replaces the annotation with that id. Updating an id that isn't on screen fails the step.
- `clear`: `true` clears every annotation; an array of id strings clears just those. Clearing an id that isn't on screen does nothing.

`clear` runs before `add`, so `{ "clear": ["a"], "add": [{ "id": "a", ... }] }` replaces `a`.

**Annotation object.** Each annotation names **exactly one** type, whose value is the target it points at:

| Type | Purpose |
|------|---------|
| `outline` | Draw a box around the target |
| `arrow` | Point an arrow at the target |
| `badge` | Mark the target with a small numbered/lettered marker (`label` sets the characters) |
| `callout` | Label the target with a text box and leader line (`label` sets the text) |
| `blur` | Obscure the target to redact it; pair with `all` to redact every match |
| `text` | Place a standalone text box (`label` sets the text) |

A **target** is a string (display text or selector), a detailed find object (`selector`, `elementText`, `elementId`, `elementTestId`, `elementClass`, `elementAttribute`, `elementAria` — at least one; `selector`/`elementClass`/`elementAttribute` are browser-only), or `{ "position": ... }` for a fixed spot. A `text` box has no element, so target it by position, e.g. `{ "text": { "position": "top-right" }, "label": "Demo data" }`.

Shared annotation fields:
- `label`: Text to display. Required by `badge`, `callout`, and `text`; ignored by the others.
- `id`: Handle (pattern `^[A-Za-z0-9_-]+$`) so a later `annotate` step can update or clear this annotation.
- `style`: Visual overrides, all optional. `color` and `background` are CSS color strings (hex, rgb, or named; `background` also takes `transparent`); `fontFamily` is a string; `opacity` is 0–1; `strokeWidth`, `fontSize`, `radius`, `padding`, `maxWidth`, and `intensity` are numbers in pixels (except `intensity`, blur strength ≥ 1). Anything unset falls back to the resolved theme.
- `position`: Placement relative to the target — a named region (`top`, `bottom`, `left`, `right`, `center`, `top-left`, `top-right`, `bottom-left`, `bottom-right`), an absolute point `{ "x": number, "y": number }`, or a nudge `{ "offset": { "x": number, "y": number } }`.
- `all`: If `true`, annotate every match instead of only the first. Most useful with `blur`.

Fields that apply to recordings and are inert in still screenshots:
- `track`: Follow the element as the page scrolls or reflows.
- `transition`: How the annotation enters and leaves — `enter` (`none`, `fade`, `pop`, `draw`), `exit` (`none`, `fade`), and `durationMs`.
- `duration`: Milliseconds to stay up before clearing itself, with no paired `clear` step.

Narrate a recording, moving the same annotations from field to field:

```json
{
  "tests": [
    {
      "steps": [
        { "record": "sso-setup.webm" },
        { "annotate": { "add": [
          { "id": "step", "badge": "#idp", "label": "1" },
          { "id": "guide", "callout": "#idp", "label": "Pick your provider first", "position": "right", "track": true }
        ] } },
        { "click": "#idp" },
        { "annotate": { "update": [
          { "id": "step", "badge": "#metadata-url", "label": "2" },
          { "id": "guide", "callout": "#metadata-url", "label": "Paste the metadata URL" }
        ] } },
        { "annotate": { "clear": true } },
        { "stopRecord": true }
      ]
    }
  ]
}
```

Redact every match for a whole recording. Set `transition.enter` to `none` on a redaction blur — an annotation that fades in leaves the content readable for the length of the animation, and every frame is in the recording:

```json
{
  "annotate": {
    "add": [
      {
        "id": "redact",
        "blur": { "selector": ".account-id" },
        "all": true,
        "track": true,
        "transition": { "enter": "none" }
      }
    ]
  }
}
```

**Output:** `$$annotationCount` — the number of annotations on screen after the step.

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
