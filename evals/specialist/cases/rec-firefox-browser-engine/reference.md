The `browser` engine records only Chrome. It captures a Chrome tab with Chrome's screen-capture API, so on Firefox the step is SKIPPED: `Skipped: the browser recording engine requires Chrome. Use the ffmpeg engine for firefox.`

Without the engine field you hit the other limit. Headless Firefox and Safari can't be recorded, because the `ffmpeg` engine captures the screen and a headless browser draws nothing on it. Those `record` steps are SKIPPED, not failed, with `Skipped: a headless Firefox can't be screen-recorded.`

Your `autoRecord: false` matters here. While `autoRecord` is on, which is the default, Doc Detective runs headless Firefox headed when the host can capture the screen, and its `record` steps then record too. With it off, Firefox stays headless.

To record Firefox, remove `"engine": "browser"` and run Firefox headed. Install Xvfb on the Ubuntu runner (`sudo apt-get install -y xvfb`) in a step before Doc Detective. Doc Detective finds it, starts its own virtual display, and records Firefox there with the `ffmpeg` engine. In `.doc-detective.json`:

```json
{
  "autoRecord": false,
  "runOn": [
    {
      "platforms": ["linux"],
      "browsers": [{ "name": "firefox", "headless": false }]
    }
  ]
}
```

If the recordings don't need to show Firefox, switch the context to Chrome. Headless Chrome records its tab with the `browser` engine and needs no display or Xvfb.
