Nothing is broken. All of that is how automatic screenshots work.

`--no-auto-screenshot` sets `autoScreenshot` at the config level. A test's setting overrides a spec's, which overrides the config's, so a test that sets `"autoScreenshot": true` still gets automatic screenshots under the flag. To stop them in that test too, remove its `autoScreenshot` or set it to `false`.

Automatic screenshots follow steps that drive a UI: a browser, a native app, or a device. A step that drives no UI, such as `runShell`, `httpRequest`, or `wait`, gets none. Neither does a step with its own `screenshot`, since it already makes one. A step that fails still gets one, because the failure frame is usually the most useful one for debugging.

They land in the run folder, at `<outputDir>/.doc-detective/runs/<runId>/specs/<specId>/tests/<testId>/contexts/<contextId>/screenshots/`, named by the step's place in the test, such as `01-goTo-<stepId>.png`. Each step's result names its image in `autoScreenshotPath`. Automatic screenshots never compare against a reference. For drift detection, use a `screenshot` step with `maxVariation`.
