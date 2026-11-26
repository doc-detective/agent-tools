Neither action treats `timeout: 0` as "no limit" in version 5.

On `goTo`, `timeout` limits how long the page may take to load, and it must be `1` or more. `0` makes the spec invalid, so the run exits `2` before any test runs, with ``tests[0].steps[0].goTo.timeout: must be >= 1.`` The same rule covers `runShell`, `runCode`, and `httpRequest`. No value turns the limit off. Leave `timeout` out to use the default (30000 ms for `goTo`), or set a larger number.

On `find`, `timeout` is how long to look for the element, and `0` is valid. It checks once without waiting. "Loaded after 2 seconds" appears 2 seconds after the page loads, so a single check fails right away. Give `find` a timeout longer than the delay. The default, 5000 ms, already covers it:

```json
{
  "tests": [
    {
      "steps": [
        { "goTo": "http://localhost:8092/wait-delay.html" },
        {
          "find": {
            "elementText": "Loaded after 2 seconds",
            "timeout": 10000
          }
        }
      ]
    }
  ]
}
```

`find` passes as soon as the element appears, so a generous timeout doesn't slow a passing test.
