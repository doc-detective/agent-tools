I ran `npx doc-detective@5 validate tests/api.spec.json`. It found 4 errors:

1. `/tests/0/steps/0/httpRequest/method`: must be one of get, put, post, patch, delete (got "FETCH").
2. `/tests/0/steps/1/find/timeout`: must be an integer (got "soon").
3. `/tests/0/steps/2`: unknown key `waitFor`.
4. `/tests/0/steps/3/runShell/exitCodes`: must be an array (got "0").

Validation FAILED
