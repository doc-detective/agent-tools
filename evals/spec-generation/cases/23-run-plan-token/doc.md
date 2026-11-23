# Download your run plan

Automation clients fetch their run plan from the demo API. The plan endpoint
only answers requests that carry a runner token in the `x-runner-token` header.

## Before you begin

Ask your workspace owner for a runner token. Owners create tokens in the admin
console under **Settings > Runner tokens**. A token is shown only once, so save
yours in your team's password manager right away.

This guide uses the sandbox token `test-token-123`, which works on every local
installation of the demo app.

## Fetch the plan

1. Send a `GET` request to `http://localhost:8093/api/resolved-tests` with this
   header:

   ```
   x-runner-token: test-token-123
   ```

   The API responds with `200 OK`. The plan's `resolvedTestsId` is
   `api-resolved-tests-id`.

## Confirm that anonymous requests are blocked

2. Send the same request again, but leave out the `x-runner-token` header.

   The API refuses it with `401 Unauthorized` and the body
   `{ "error": "Unauthorized" }`.
