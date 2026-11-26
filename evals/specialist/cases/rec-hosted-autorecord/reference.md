Hosted runs record. They just turn automatic capture off at the config level. The hosted runner sets `autoRecord: false` and `autoScreenshot: false` in the config it builds, over whatever your repository's `.doc-detective.json` says. That keeps hosted runs from storing images and video of your pages unless a spec or test asks for them.

The spec and test levels still win over the config level. Set `autoRecord: true` in the spec, or on a single test, to get the automatic recording in hosted runs:

```json
{
  "autoRecord": true,
  "tests": [
    {
      "steps": [
        { "goTo": "https://example.com" },
        { "find": "Example Domain" }
      ]
    }
  ]
}
```

A `record` step you write is unaffected too. It records in hosted runs the same as locally.
