I ran `npx doc-detective@5 validate tests/profile.spec.json`. It failed:

- `tests[0].steps[1]`: unknown action `action`.

Validation FAILED

I fixed the step to use the v3 shape, `{"click": {"selector": "#profile"}}`, and validated again: 1 valid, 0 invalid.
