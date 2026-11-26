The warning comes from missing baselines, not from a UI change. `signup.mp4` already exists, and `overwrite` defaults to `"false"`, so Doc Detective skips the capture every night. It still runs the checkpoints and compares them against the committed baselines in `media/signup.mp4.checkpoints/`. You never committed that folder, so every checkpoint has no baseline, and a recording with no baselines always reports stale. A skipped span never writes anything, so it never seeds the baselines either. The warning repeats every night.

Let a run record the span so it seeds the baselines. Set `overwrite` to `"aboveVariation"`. The span then records on every run, seeds any missing baselines, and replaces `signup.mp4` only when the span meaningfully changed: checkpoint drift beyond `maxVariation`, an added, removed, or edited step, or a missing file. Commit `media/signup.mp4.checkpoints/` alongside the video. Deleting `signup.mp4`, or `overwrite: "true"`, also records the span and seeds the baselines.

The job stays green because staleness is a WARNING, and a WARNING never fails a run. The exit code is `0`. To fail the job, act on the `stopRecord` outputs in a later step. With `"aboveVariation"`, `$$changed` is `true` when the recording needed a refresh. With the default `overwrite`, `$$stale` is `true` when the committed recording no longer matches:

```json
{
  "tests": [
    {
      "steps": [
        { "goTo": "https://example.com/signup" },
        { "record": { "path": "media/signup.mp4", "overwrite": "aboveVariation" } },
        { "find": "Create account" },
        { "stopRecord": true, "variables": { "SIGNUP_CHANGED": "$$changed" } },
        {
          "description": "Fail when the recording needed a refresh.",
          "runShell": "node -e \"if (process.env.SIGNUP_CHANGED === 'true') process.exit(1)\""
        }
      ]
    }
  ]
}
```

You can also read the warning count from the results file's `summary` and fail the job when it's above zero.
