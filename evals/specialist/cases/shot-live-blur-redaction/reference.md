Use an `annotate` step. A `blur` in a screenshot's `annotations` exists only in that image: Doc Detective composites it into the PNG and never touches the page, so the recording shows `#secret` in the clear. An `annotate` blur is drawn into the page and stays up across steps until something clears it, so the video hides it the whole time.

Screenshots taken while the `annotate` blur is up come out blurred in every browser. Firefox leaves the page's blur out of its own screenshots, so Doc Detective blurs the same regions in the saved image itself. If Doc Detective can't read where the blurs are, the `screenshot` step fails rather than save an image without them. In Chrome the region gets blurred twice, which shifts it by a shade or two, so retake any reference image you compare with `maxVariation`.

Set `"transition": { "enter": "none" }` on the blur. A blur that fades in leaves the content readable for the length of the animation, and every frame of that is in the recording.

```json
{
  "tests": [
    {
      "steps": [
        { "goTo": "http://localhost:8092/annotate-blur.html" },
        {
          "annotate": {
            "add": [
              { "id": "redact", "blur": "#secret", "transition": { "enter": "none" } }
            ]
          }
        },
        { "record": "walkthrough.webm" },
        { "screenshot": "redacted.png" },
        { "stopRecord": true },
        { "annotate": { "clear": ["redact"] } }
      ]
    }
  ]
}
```

Add the blur before `record` starts, so no frame shows the page unredacted. To blur every match of a selector, use an object target with `all: true`, such as `{ "blur": { "selector": ".api-key" }, "all": true }`.
