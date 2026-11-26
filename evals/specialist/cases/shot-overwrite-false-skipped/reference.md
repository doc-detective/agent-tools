`"overwrite": "false"` doesn't mean "compare but never replace." When a file already exists at `path`, Doc Detective keeps it and skips the capture, so the step reports SKIPPED and no comparison runs. `maxVariation` has no effect.

To compare, use `"overwrite": "aboveVariation"`, the default, or leave `overwrite` out:

```json
{
  "screenshot": {
    "path": "home.png",
    "maxVariation": 0.02,
    "overwrite": "aboveVariation"
  }
}
```

The step captures a new image and compares it against `home.png`:

- A difference within `maxVariation` reports PASS and leaves `home.png` alone.
- A difference above `maxVariation` reports WARNING, not FAIL, and replaces `home.png` with the new capture. The run continues, and the next run compares against the new image.

Because a drift replaces the file, keep `home.png` committed so the replacement shows up as a change you can review or revert. `"overwrite": "true"` replaces the file on every run with no comparison, so use it only to reset a reference.
