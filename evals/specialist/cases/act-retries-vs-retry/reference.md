The config `retries` setting doesn't retry steps. It re-runs a whole context on a fresh browser session, and only when that session turns out to be unusable. That means the session is dead, the browser sits on a crash or error page, or the page never left its initial blank document. A real failure, where the page loaded and the element isn't there, is never retried. `retries` defaults to `1`, and its maximum is `10`.

To retry one step, add an `onFail` routing handler with a `retry` entry to that step:

```json
{
  "tests": [
    {
      "steps": [
        { "goTo": "http://localhost:8092/" },
        {
          "find": "Standard Button",
          "onFail": [
            { "retry": { "limit": 2, "delay": 1000 } }
          ]
        }
      ]
    }
  ]
}
```

`limit` counts re-runs after the first attempt, so `limit: 2` allows up to three runs. `delay` waits that many milliseconds before each retry, and `"backoff": "exponential"` doubles the wait each time. If a retry passes, the step passes. If every attempt fails, the step falls through to the next matching entry or to the FAIL default, which stops the test. The step's result has an `attempts` field with the number of runs.

For a page that's only slow to render, a longer `find` `timeout` also works, because `find` already polls until the element appears or the timeout passes.
