The `stopRecord` step reports the saved video's metadata in its outputs: `$$recordingPath`, `$$format`, `$$duration`, `$$width`, `$$height`, and `$$fps`. Capture them with the step's `variables` object, which also exports them to the environment of later steps. Read them in `runShell` through `process.env`.

Don't assert an exact 800-pixel height. Headless Chrome records with the `browser` engine, and the video matches the viewport's width. While Chrome captures a tab, it shows a sharing bar that makes the page a little shorter, so the video is usually a few dozen pixels shorter than the 800-pixel viewport. When the captured frames come in more than one size, Doc Detective scales the video to the frame size that covers the most of the recording's time. Check the width exactly and the height as no taller than the viewport:

```json
{
  "tests": [
    {
      "steps": [
        { "goTo": "http://localhost:8092/" },
        { "record": "flow.mp4" },
        { "find": "Standard Button" },
        { "wait": 1500 },
        {
          "stopRecord": true,
          "variables": {
            "VIDEO_PATH": "$$recordingPath",
            "VIDEO_WIDTH": "$$width",
            "VIDEO_HEIGHT": "$$height"
          }
        },
        {
          "description": "Fail unless the video is 1200 pixels wide and no taller than the viewport.",
          "runShell": "node -e \"const w = Number(process.env.VIDEO_WIDTH), h = Number(process.env.VIDEO_HEIGHT); console.log(process.env.VIDEO_PATH, w, h); if (w !== 1200 || h > 800) process.exit(1)\""
        }
      ]
    }
  ]
}
```

The metadata outputs are best-effort. When Doc Detective can't read the saved file, it leaves them out without failing the step.
