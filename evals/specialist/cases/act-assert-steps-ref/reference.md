Custom assertions can read only the current step's `$$outputs.*` and `$$platform`. They can't read another step's outputs through `$$steps.*`. That reference never resolves, so the assertion fails closed and the step fails every time, whatever the IDs are. Doc Detective logs a warning about the `$$steps.*` reference.

Pass the value forward as a variable instead. A step-level `variables` object on step 1 saves the id as the environment variable `USER_ID`. Step 2 then checks its response against `$USER_ID`:

```json
{
  "tests": [
    {
      "steps": [
        {
          "stepId": "create",
          "httpRequest": {
            "url": "http://localhost:8093/api/users",
            "method": "post",
            "request": { "body": { "id": "u-42" } }
          },
          "variables": { "USER_ID": "$$response.body.id" }
        },
        {
          "httpRequest": {
            "url": "http://localhost:8093/api/orders",
            "method": "post",
            "request": { "body": { "userId": "u-42" } },
            "response": { "body": { "userId": "$USER_ID" } }
          }
        }
      ]
    }
  ]
}
```

`variables` sits on the step, beside `httpRequest`. Reports show the value as `***USER_ID***`, but the response check compares the real value. An assertion works too, if you quote the variable: `"$$outputs.response.body.userId == \"$USER_ID\""`.

`$$steps.<stepId>.outputs` does work in a step-level `if` condition, which decides whether a step runs, not whether it passes.
