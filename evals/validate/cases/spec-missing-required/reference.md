I ran `npx doc-detective@5 validate tests/health.spec.json`.

- `tests[0].steps[0].httpRequest`: needs one of `url`, `openApi`. The request has a method and status codes but no URL to call.

Validation FAILED
