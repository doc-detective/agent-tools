Neither one does that.

There's no `--retries` flag. The CLI rejects it as an unknown option and exits `2`.

The config `retries` key does something narrower. It defaults to `1`, allows up to `10`, and re-runs a whole context on a fresh session only when the session itself turned unusable: the session died, the browser sits on a crash or error page, or the context never left its blank starting page. A real failure, where the page loaded and the element or assertion failed, is never retried. A `find` that misses "Standard Button" on a loaded page fails on its first attempt, whatever `retries` says.

To retry a flaky check, put a `retry` handler in that step's `onFail`:

```json
{
  "testId": "home",
  "steps": [
    { "goTo": "http://localhost:8092/" },
    {
      "find": "Standard Button",
      "onFail": [{ "retry": { "limit": 3, "delay": 1000 } }]
    }
  ]
}
```

Doc Detective re-runs the step up to `limit` times, waiting `delay` milliseconds between attempts. `backoff: "exponential"` doubles the wait each time. The step's result is the result of its final attempt, and its `attempts` field counts the runs. A `retry` handler works on steps only. On a test, it makes the spec invalid.
