No. An untargeted `stopRecord` never stops the automatic recording. It stops the most recent recording a `record` step started. Doc Detective finalizes the automatic recording itself at the end of the context.

In this test, though, there's no automatic recording to cut short. A context with no `runOn` runs headless Chrome. In headless Chrome, an explicit `record` step replaces the automatic recording, because a Chrome context records one tab at a time. So that context saves `checkout.mp4` only, and its results have no `autoRecording` field. Your other tests, with no `record` step, still get the automatic video at `.doc-detective/runs/<runId>/specs/<specId>/tests/<testId>/contexts/<contextId>/recordings/<contextId>.mp4`.

To get both videos from one test, run it headed (`headless: false` on the browser in `runOn`). The automatic recording then captures the screen with the `ffmpeg` engine, and your `record` step records the tab with the `browser` engine. A headed context needs a display, or Xvfb on Linux.

Leaving out `stopRecord` doesn't lose the clip. Doc Detective stops any recording still running when the test ends and saves the file.
