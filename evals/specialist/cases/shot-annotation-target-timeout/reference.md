An annotation's element target waits up to 5000 milliseconds for its element, then fails the step. Doc Detective doesn't save an unannotated image instead. Your panel appears after about 6.5 seconds, so the default wait runs out first.

`timeout` belongs on the target, not on the annotation. The string shorthand `"#late-panel"` has nowhere to put it, so switch to the object form and set `timeout` there:

```json
{
  "tests": [
    {
      "steps": [
        { "goTo": "http://localhost:8092/annotate-late-element.html" },
        {
          "screenshot": {
            "path": "late-panel.png",
            "annotations": [
              { "outline": { "selector": "#late-panel", "timeout": 10000 } }
            ]
          }
        }
      ]
    }
  ]
}
```

`timeout` works like `find`'s: milliseconds, and `0` checks once. Each target has its own, so one slow element doesn't make the others wait.
