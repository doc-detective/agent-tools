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

### runBrowserScript

Execute JavaScript in the browser page context. The script runs against the live page under test, so it has access to `document`, `window`, and the DOM. Use it to read computed DOM state, seed app state (such as `localStorage`), or assert on values only reachable from JS. This is distinct from `runCode`, which runs Node, Python, or Bash on the host machine.

Like `goTo`, `find`, and `click`, it needs a live page, so it runs only in a browser context.

**String form** (use `return` to capture a value):

```json
{ "runBrowserScript": "return document.title;" }
```

**Object form**:

```json
{
  "runBrowserScript": {
    "script": "return arguments[0] + arguments[1];",
    "args": ["foo", "bar"],
    "output": "foobar"
  }
}
```

The script's return value is captured into the step's `outputs.result`, so it flows into the step-level `variables` plumbing via `$$result`:

```json
{
  "runBrowserScript": "return window.localStorage.getItem('token');",
  "variables": { "TOKEN": "$$result" }
}
```

**Options:**
- `script`: JavaScript to evaluate in the page (required in object form). Values from `args` are available via the `arguments` object (`arguments[0]`, `arguments[1]`, ...).
- `args`: Array of values passed positionally to the script. Each item may be any JSON-serializable value (string, number, boolean, null, object, or array).
- `output`: Expected content in the serialized return value (non-string values are serialized to JSON before matching). Supports a substring or a regular expression that starts and ends with `/`, like `/^https?:\/\//`.
- `path`: File path to save the serialized return value, relative to `directory`
- `directory`: Directory to save the return value (defaults to your media directory)
- `maxVariation`: Allowed fraction (0–1) of difference from a previously saved value before the step returns a warning
- `overwrite`: Whether to rewrite saved output: `"true"`, `"false"`, or `"aboveVariation"` (default `"aboveVariation"`)
- `timeout`: Max time in ms the script may run (default 60000)
- `surface`: The browser window or tab to run the script in. Omit it to run in the active tab.

Running arbitrary JavaScript can modify application state. Mark a step `unsafe: true` when its script could have side effects. Unsafe steps run only when the `allowUnsafeSteps` config option or the `--allow-unsafe` flag allows them, and are skipped otherwise.

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

Draw annotations onto the page so they persist across steps, survive navigation, and appear in any recordings and screenshots taken while they're visible. A screenshot's own `annotations` last only for that capture. These stay on screen until an `annotate` step clears them, their `duration` elapses, or the context ends. Browser only: on an app-only context with no page to draw into, the step is skipped rather than failed.

The value is an object with **at least one** of `add`, `update`, or `clear`:

```json
{ "annotate": { "add": [{ "outline": "#submit-button" }] } }
```

```json
{ "annotate": { "clear": true } }
```

- `add`: Array of annotation objects to draw. Give an annotation an `id` to update or clear it later; adding one with an id already on screen replaces it.
- `update`: Array of annotation objects to change, each matched by `id` (`id` is required on every entry). Each entry replaces the annotation with that id. Updating an id that isn't on screen fails the step. An update is a full replacement, so fields you leave out reset to their defaults: repeat `track`, `transition`, `style`, and any other field you want to keep.
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
| `text` | Place a standalone text box at a fixed position (`label` sets the text; the target must be `{ "position": ... }`) |

A **target** takes one of three forms:

- A string: display text or a selector.
- A detailed find object with at least one of `selector`, `elementText`, `elementId`, `elementTestId`, `elementClass`, `elementAttribute`, or `elementAria`. `selector`, `elementClass`, and `elementAttribute` are browser-only.
- `{ "position": ... }` for a fixed spot.

A `text` box has no element, so target it by position, for example `{ "text": { "position": "top-right" }, "label": "Demo data" }`.

Shared annotation fields:
- `label`: Text to display. Required by `badge`, `callout`, and `text`; ignored by the others.
- `id`: Handle (pattern `^[A-Za-z0-9_-]+$`) so a later `annotate` step can update or clear this annotation.
- `style`: Visual overrides, all optional. `color` and `background` are CSS color strings (hex, rgb, or named), and `background` also takes `transparent`. `fontFamily` is a string, and `opacity` is 0–1. `strokeWidth`, `fontSize`, `radius`, `padding`, and `maxWidth` are numbers in pixels, and `intensity` is the blur strength (≥ 1). Anything unset falls back to the resolved theme.
- `position`: Placement relative to the target. Use a named region (`top`, `bottom`, `left`, `right`, `center`, `top-left`, `top-right`, `bottom-left`, `bottom-right`), an absolute point `{ "x": number, "y": number }`, or a nudge `{ "offset": { "x": number, "y": number } }`.
- `all`: If `true`, annotate every match instead of only the first. Most useful with `blur`.

Fields that apply to recordings and are inert in still screenshots:
- `track`: Follow the element as the page scrolls or reflows.
- `transition`: How the annotation enters and leaves: `enter` (`none`, `fade`, `pop`, `draw`), `exit` (`none`, `fade`), and `durationMs`, the animation length.
- `duration`: Milliseconds the annotation stays visible before it clears itself, with no paired `clear` step. This is its lifespan, not the animation length in `transition.durationMs`.

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

Redact every match for a whole recording. Set `transition.enter` to `none` on a redaction blur. An annotation that fades in leaves the content readable while it animates, and every frame lands in the recording:

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

**Output:** `$$annotationCount`, the number of annotations on screen after the step.

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

- `onPass`: after the step passes
- `onFail`: after the step fails
- `onWarning`: after the step produces a warning
- `onSkip`: after the step is reached but skipped (blocked as `unsafe`, or its guard `if` evaluated false)

Each entry pairs an optional `if` condition with exactly one routing action (`continue`, `stop`, `retry`, or `goToStep`). The first entry whose condition holds wins; an entry with no `if` always matches. If no entry matches, the step's status default applies.

An `if` is a condition expression, or an array of expressions that must all hold. It can read the step's own outputs through `$$outputs.*` and the operating system through `$$platform` (`linux`, `mac`, or `windows`), with the operators `==`, `!=`, `>`, `>=`, `<`, `<=`, `contains`, `oneOf`, and `matches`:

```json
{
  "runShell": { "command": "./scripts/smoke-test.sh" },
  "onFail": [
    { "if": "$$outputs.exitCode == 2", "continue": true },
    { "stop": "test" }
  ]
}
```

Routing is opt-in. A step with no handlers uses the defaults: `PASS`, `WARNING`, and `SKIPPED` continue to the next step, and `FAIL` stops the test.

Routing chooses flow, not the verdict. A step that fails still reports `FAIL` and still fails the test even when its `onFail` handler routes `continue`. Later steps run, but the rolled-up result stays failed.

A handler fires only if the step was reached. A step that never ran because an earlier step stopped execution fires no handler.

### continue and stop

- `continue`: proceed to the next step. Use it to override a status default, for example to keep going after a failure.
- `stop`: halt execution at the given scope. `{ "stop": "test" }` ends the current test's remaining steps. `{ "stop": "spec" }` ends the spec's remaining tests, and `{ "stop": "run" }` behaves the same as `"spec"`.

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

Once retries are exhausted, Doc Detective re-resolves routing with `retry` entries skipped to find the terminal action. So `onFail: [{ "retry": { "limit": 2 } }]` retries twice and then stops (the `FAIL` default), while `onFail: [{ "retry": { "limit": 1 } }, { "continue": true }]` retries once and then continues. `retry` is a no-op under `onSkip`. When a step is retried, its result includes an `attempts` field with the total run count.

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

The target matches by `stepId` within the same test; if two steps share a `stepId`, the first wins. An unknown target is a misconfiguration, so Doc Detective records a `FAIL` and stops rather than report green on a typo.

A `goToStep` can point at an earlier step, which re-runs it. Each re-run appends a fresh report stamped with an incrementing `visit` number; the first run omits `visit`. A visit cap of `1000 × (number of steps) + 1000` step runs per test bounds loops. A self-referential jump hits the cap, records a `FAIL`, and stops instead of hanging. As with the other handlers, a jump never changes a verdict. A backward jump that re-runs a step which failed on its first visit leaves the test failed.

A step handler doesn't jump between tests. If a step entry with `goToTest` matches, Doc Detective applies the step's status default instead and ignores the later entries. To jump between tests, use a test-level handler.

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
