Results after the fix: 1 passed, 0 failed.

The first run stopped before anything executed: the inline test in docs/list-users.md was invalid. Its `httpRequest` step used `statusCode`, which isn't a field; the field is `statusCodes`. I renamed it in the step comment, left the prose as it was, and reran. The test passes: the API returns `200` and echoes `"page": "2"`.
