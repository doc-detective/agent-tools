Doc Detective has no `hover` action, and `find` has no `hover` option. In version 5, a key Doc Detective doesn't recognize makes the spec invalid, so the run exits `2` before any test runs. Here the error reads ``tests[0].steps[1].find: unknown key `hover`.``

To hover, set `moveTo` to `true` on `find`. Doc Detective moves the cursor to the element and scrolls it into view if it isn't visible:

```json
{
  "tests": [
    {
      "steps": [
        { "goTo": "http://localhost:8092/" },
        {
          "find": {
            "elementText": "Standard Button",
            "moveTo": true
          }
        }
      ]
    }
  ]
}
```

`moveTo` defaults to `false`. A bare `find` leaves the cursor and the viewport where they are, so set `moveTo` whenever a step should scroll or a recording needs the cursor to travel to the element.
