The `browserFallback` setting controls this. When a browser can't start, Doc Detective first tries to repair it once by reinstalling the browser and its driver. If that doesn't help, `browserFallback` decides what happens next:

- `auto` (the default) falls back to another available browser. If Doc Detective picked the browser itself, the context reports PASS. If you requested the browser explicitly, as your `browsers: "firefox"` does, the context runs on the fallback browser but reports WARNING. That's the result you saw.
- `explicit` falls back only when Doc Detective auto-selected the browser. An explicitly requested browser whose driver can't start is SKIPPED with a diagnostic reason that names the browser and the likely cause.
- `off` never falls back across browsers. The broken Firefox context is SKIPPED with the same diagnostic.

Neither `explicit` nor `off` turns the context into a FAIL. It skips. A run where every test skips exits `2`, so a CI job still goes red when nothing ran.

Set it for the whole run in your config:

```json
{
  "browserFallback": "off"
}
```

Or pass `--browser-fallback off` on the command line. To limit it to one context, set `browserFallback` on that `runOn` entry. A context-level value takes precedence over the config:

```json
{
  "platforms": ["windows", "mac", "linux"],
  "browsers": "firefox",
  "browserFallback": "off"
}
```
