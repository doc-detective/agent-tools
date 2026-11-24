# Spec-generation eval cases

Each case in `cases/<id>/` is a how-to doc a user asks the Doc Detective plugin to
turn into a test spec. The docs describe "the demo app": the Doc Detective repo's
test servers (`http://localhost:8092` static pages, `http://localhost:8093` echo API).

| File | Purpose |
| --- | --- |
| `doc.md` | The input doc. Plain product-docs prose; no inline tests. |
| `expected.json` | Required-step checklist for grading a generated spec. |
| `reference.spec.json` | A hand-written v5 spec that PASSes against the test servers. |

## `expected.json` format

```json
{
  "steps": [
    {"stepType": "find", "match": "Jane Smith", "match_any": ["..."], "note": "doc sentence this checks"}
  ],
  "must_not": ["things a correct spec must NOT do"]
}
```

- `stepType`: the Doc Detective action key the generated step must use, or an array of
  acceptable keys. The field is called `stepType` rather than `action` because the
  plugin's PreToolUse hook rejects files that pair an `action` key with an action name.
- `match`: a string or array of strings. Every one must appear, case-insensitively, in the
  JSON-serialized step.
- `match_any`: optional array. At least one must appear in the serialized step.
- `fields`: optional object. Each key is a dotted path inside the action's value, such as
  `request.body.role`. Its value is a case-sensitive regex that the value at that path must
  match. A string is tested as is, anything else as JSON. Use it when a substring could match
  the wrong part of the step, such as an expected response instead of the request.
- Matching strips backslashes first, so regex escapes in a step still match.
- `may_share`: optional. When no unused step matches, this entry may reuse a step an
  earlier entry claimed: two facts one step can check together.
- Expected steps appear in doc order; a generated spec may add extra steps between them.
- `must_not`: prose for a human or LLM grader. Covers unautomatable instructions, traps,
  and conditional advice that shouldn't become steps.

The [manni](cases-manni.md) and [dd-docs](cases-dd-docs.md) slices use the same format,
plus `doc_path` (where the page goes in the workspace) and a `workspace/` folder.

Each doc writes a field or button label exactly as the page shows it, colon included.
For example, `Type here:` and `Echo input:`. A spec that finds the label by its text then matches.

## Cases

| id | tags | summary |
| --- | --- | --- |
| 01-home-page-tour | navigation, find | Open the home page; see the title and a row in the sample table. |
| 02-jump-to-section | navigation, click, find | Use the nav menu to jump to Lists and Tables; verify section content. |
| 03-preview-notifications | click, find | Click two buttons; each adds a message to the panel. |
| 04-live-preview | type, find | Type into a field; the preview line echoes the text. |
| 05-profile-form | form, type, click | Fill three text fields, two checkboxes, and a dropdown. The dropdown label `Option 2` collides with a checkbox label. |
| 06-billing-frequency-ambiguous | hard:ambiguous-label, click | Select radio "Option 2", then "Option 3". The same labels exist on checkboxes earlier in the DOM. |
| 07-background-action | wait, click, find | A notice appears after 2 s; a button reveals a message after 200 ms. |
| 08-system-health-indirect | hard:indirect-expected, wait, find | The tile and status line appear late. The expected result is paraphrased ("tells you the system is operational"). |
| 09-loading-content | wait, find | Content loads from the API after a fetch; don't assert the transient "Loading...". |
| 10-open-record-new-tab | multi-tab, click, type, find | A link opens a new tab. Type in that tab, then check the original tab. |
| 11-dashboard-layout-drag | drag-and-drop, find | Drag two widgets into two drop zones; verify the dropped items and the status bar. |
| 12-api-list-users | http | GET with a query param; the response echoes `page: "2"`. |
| 13-api-create-user | http | POST a JSON body; the response echoes `name` and `job`. |
| 14-api-error-responses | http | `/status/404` and `/status/503` need non-default `statusCodes`. |
| 15-api-request-tracing | http, headers | Send `X-Test`; assert the `X-Echo-Test` and `X-Server` response headers. |
| 16-resource-links | link-check | Four bookmark links (3 web pages, 1 API endpoint) must resolve. |
| 17-verify-installation-ui-api | mixed-ui-api, http, type, find | API status check and POST, then web home page and typed echo. |
| 18-saved-preferences-prerequisite | hard:prerequisite, navigation, find | A "Before you begin" cookie-setting step must run first in the same session, or the main check FAILs. |
| 19-join-workspace-manual-steps | non-automatable, type, find | Ask an admin, check email, and click a link in the email around one automatable typing step. |
| 20-export-customer-table-manual-steps | non-automatable, find | Role request, SSO sign-in, print to PDF, and upload/email around a table check. |
| 21-sync-feed-troubleshooting | non-automatable, wait, find | Late-arriving feed entries plus a "restart VPN / reboot / file a ticket" troubleshooting section. |
| 22-update-user-record | http, methods, headers | `PUT` then `PATCH` on `/api/users/42`, then a nested `GET` with a query param; check the `X-Echo-Path` header. |
| 23-run-plan-token | http, headers, non-automatable | Fetch with the sandbox `x-runner-token`, then the same request without it needs `statusCodes: [401]`. An "ask the owner / admin console" prerequisite isn't automatable. |
| 24-troubleshoot-live-dashboard | hard:never-idle, mixed-ui-api, troubleshooting | API check, static page, then a page that polls forever: `goTo` needs lower idle times, and the counter `Request #N completed` needs a pattern. Skip the restart/support section. |
| 25-checkout-controls-indirect | hard:indirect-expected, find | "Confirm it's switched off" means asserting the disabled state, not clicking; the result line is paraphrased ("the last operation succeeded"). |
| 26-order-lookup-variable-number | hard:variable-value, find | The order number varies (`Order #` + four digits), so its find needs a regex; the doc's example number doesn't exist. |
| 27-plan-tier-shared-labels | hard:ambiguous-label, click, find | Three buttons share an accessible name, test ID, and class; only the visible text (`Third`, `Second`) picks the right one. |
| 28-message-actions-right-click | click-options, find | Right-click, then left-click, the same button; each posts a different message. |
| 29-capture-get-started-button | screenshot, non-automatable | Screenshot cropped to one button under a fixed header, then "upload to the portal / ask your editor". |
| 30-account-overview-slow-panels | hard:timeout, find | Panels arrive at 6.5 s and 8 s, past `find`'s default 5000 ms timeout. |
| 31-compare-records-two-tabs | multi-tab, click, type, find | Open two child tabs (`window.open` and a link), type a note in each, then check the first tab kept its note. |
| 32-gateway-extra-field | hard:indirect-expected, http | Port 8092 adds `extraField`; "exactly the fields you sent" on port 8093 needs `allowAdditionalFields: false`. |
| 33-toolbar-icon-buttons | click, wait, find | Single-letter buttons (`I`, `S`) plus a job that reports back after 1.5 s. |

## Running a spec

Use Node.js `>=22.22.2`, `>=24.15`, or `>=26.12.1`. Doc Detective 5.6 uses Appium 4, which won't start on older versions.
On Node 24.11 it hangs for 120 s, then fails with `Appium server ... failed to start`.

```bash
# 1. Start the test servers from a doc-detective checkout (after `npm ci` there)
cd <doc-detective> && node test/server/start.js &
node test/server/wait-ready.js

# 2. Run a spec from this repo's root (headless Chrome, no screenshots or recording)
npx -y doc-detective@5.6.0 -i evals/spec-generation/cases/<id>/reference.spec.json \
  -c evals/spec-generation/doc-detective.config.json \
  -o .tmp/runs/<id>/results.json --output-dir .tmp/runs/<id> -r terminal \
  --no-auto-update --no-telemetry --no-hints --no-input
# exit 0 = PASS, 1 = a test failed, 2 = nothing ran / bad spec

# 3. Stop the servers: kill the start.js process (it handles SIGINT/SIGTERM).
```
