Those two options pull against each other, and checkpoints can't catch a broken capture.

- `overwrite: "true"` re-records and replaces the file on every run.
- `overwrite: "aboveVariation"` records every run but replaces the file only when the span meaningfully changed: checkpoint drift beyond `maxVariation` (default `0.05`), an added, removed, or edited step, or a missing file. Otherwise it discards the new capture and leaves the file and baselines untouched.
- `aboveVariation` needs checkpoints to judge change, so it turns them on, and it overrides `checkpoints: false`. Leave `checkpoints` out, or pass an object to tune `maxVariation` or `directory`.

For the black video, use `verify`. Checkpoints compare what the scene shows, and drift only returns a WARNING, which doesn't fail the build. A violated `verify` guard fails the `stopRecord` step. `notBlack` fails when black frames cover 95% or more of the video. `minDuration`/`maxDuration` and `resolution` guard length and size the same way.

```json
{
  "record": {
    "path": "media/product-demo.mp4",
    "overwrite": "aboveVariation",
    "checkpoints": { "maxVariation": 0.1 },
    "verify": { "notBlack": true, "minDuration": 2 }
  }
}
```

End the span with `{ "stopRecord": true }`. That step reports `$$changed`, and `$$allBlack` when `notBlack` ran. Commit the `media/product-demo.mp4.checkpoints/` folder alongside the video.
