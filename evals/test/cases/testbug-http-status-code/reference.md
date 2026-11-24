Results after the fix: 1 passed, 0 failed.

The first run failed: the API returned `200`, but the spec expected `204` (`Returned 200. Expected one of [204].`). The test was wrong, not the doc or the API. The doc says the API returns `200 OK` with the updated record, and notes that it doesn't answer with `204 No Content`. The response body matched. I changed the spec's `statusCodes` from `[204]` to `[200]` (confidence 95), kept the response body check, and reran. The test passes.
