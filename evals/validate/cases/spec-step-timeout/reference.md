I ran `npx doc-detective@5 validate tests/elements.spec.json`.

- `tests[0].steps[1]`: unknown key `timeout`. Move it into the action: `{"find": {"elementText": "Elements", "timeout": 5000}}`.

Validation FAILED
