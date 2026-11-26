I ran `npx doc-detective@5 validate tests/signup.spec.json`. It exits 1.

- `tests[0].steps[0]`: unknown action `action`.
- `tests[0].steps[1]`: unknown action `action`.

Both steps use the old `{"action": "goTo"}` shape. In a v3 spec the action name is the key: `{"goTo": "http://localhost:8092"}` and `{"find": {"selector": "#signup", "elementText": "Sign up"}}`.

Validation FAILED
