Hosted runs on Doc Detective Online turn automatic capture off on purpose. The hosted entrypoint sets `autoScreenshot` and `autoRecord` to `false` at the config level, and that overrides any value in your repository's config. So `"autoScreenshot": true` in `.doc-detective.json` has no effect there. Your authored `screenshot` and `record` steps still run.

`autoScreenshot` isn't a step field. On a step it's an unknown key, so the spec fails validation. Remove it from the `goTo` steps.

Set it on the spec or the test instead. Doc Detective resolves `autoScreenshot` test first, then spec, then config, so a spec or test that sets it to `true` still gets automatic screenshots in a hosted run:

```json
{
  "autoScreenshot": true,
  "tests": [
    {
      "steps": [
        { "goTo": "https://example.com/login" },
        { "click": "Sign in" }
      ]
    }
  ]
}
```

A test that sets `"autoScreenshot": false` turns them off again for that test.
