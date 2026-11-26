Doc Detective can't record audio. Recordings are video only, with no audio track, and the `record` step has no option for sound. Add a voice-over in a video editor afterward.

To narrate inside the video itself, use `annotate` steps during the recording. Annotations from `annotate` stay on the page across steps and navigation until something clears them, so they appear in the video. Annotations on a `screenshot` step apply to that one still only. Give each annotation an `id` so a later step can `update` or `clear` it:

```json
{
  "tests": [
    {
      "steps": [
        { "goTo": "http://localhost:8092/enhanced-elements.html" },
        { "record": "login-tutorial.mp4" },
        {
          "description": "Point at the username field.",
          "annotate": {
            "add": [
              { "id": "step", "badge": "#username-input", "label": "1" },
              { "id": "guide", "callout": "#username-input", "label": "Enter your username", "position": "right", "track": true }
            ]
          }
        },
        { "click": "#username-input" },
        {
          "description": "Move the annotations to the submit button.",
          "annotate": {
            "update": [
              { "id": "step", "badge": "#submit-button", "label": "2" },
              { "id": "guide", "callout": "#submit-button", "label": "Then submit" }
            ]
          }
        },
        { "wait": 1500 },
        { "annotate": { "clear": true } },
        { "stopRecord": true }
      ]
    }
  ]
}
```

`track: true` keeps the callout on its element as the page scrolls or shifts. `transition` sets how an annotation enters and leaves, and `duration` clears it on its own after that many milliseconds.
