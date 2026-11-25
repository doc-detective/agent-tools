Results after the fix: 1 passed, 0 failed.

The first run stopped before anything executed: the spec was invalid. Doc Detective reported `tests[0].steps[0].httpRequest.request: unknown key `data``. The `request` object takes the payload as `body`, not `data`. I renamed `data` to `body` in tests/place-order.spec.json, kept the response check, validated the spec, and reran. The test passes: the API returns `200` and echoes the order, as the doc says.
