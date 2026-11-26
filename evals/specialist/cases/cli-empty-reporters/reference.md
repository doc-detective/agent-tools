`reporters: []` works. It runs none of the reporters you choose, so the run prints no summary. Version 4 fell back to the default reporters instead.

The run folder comes from two other v5 defaults. `autoScreenshot` and `autoRecord` are on unless you turn them off. Doc Detective saves a screenshot after every step that drives a browser, app, or device, and records a video of every such context. Those files live in the run folder, so the `runFolder` reporter runs whenever either option is on, even when `reporters` leaves it out.

Turn both off to write only `results.json`:

```json
{
  "reporters": [],
  "autoScreenshot": false,
  "autoRecord": false
}
```

Or keep the config and pass both flags for one run:

```bash
npx doc-detective --output results.json --no-auto-screenshot --no-auto-record
```

Turning off only one of the two still writes the run folder. A spec or test that sets `autoScreenshot: true` or `autoRecord: true` still wins over the config, so its run still gets a run folder.
