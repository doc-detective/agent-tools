A screenshot's `annotations` live only in that one image. Doc Detective composites them into the saved PNG and never touches the page, so a recording that's running at the same time never shows them. `transition` and `duration` (like `id` and `track`) do nothing in a still screenshot. They apply only to annotations that an `annotate` step draws.

Use the `annotate` action instead. It draws annotations into the page, and they stay on screen across steps and navigation until an `annotate` step clears them, their `duration` elapses, or the test context ends. The recording shows whatever is on screen, and so does any screenshot taken while they're up.

```json
{
  "tests": [
    {
      "steps": [
        { "goTo": "http://localhost:8092/" },
        { "record": "walkthrough.webm" },
        {
          "annotate": {
            "add": [
              {
                "id": "guide",
                "callout": "Standard Button",
                "label": "Click here",
                "position": "right",
                "transition": { "enter": "fade", "durationMs": 400 }
              }
            ]
          }
        },
        { "wait": 2000 },
        { "annotate": { "clear": ["guide"] } },
        { "stopRecord": true }
      ]
    }
  ]
}
```

The `id` lets a later `annotate` step `update` or `clear` that annotation. `"clear": true` removes everything on screen. To have the callout clear itself, set `duration` in milliseconds instead of adding a `clear` step.
