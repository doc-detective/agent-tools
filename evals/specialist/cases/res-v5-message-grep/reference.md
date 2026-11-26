The flags still work. Those warnings mark deprecated spellings, and each has a replacement:

- `-e`/`--exit-on-fail`: delete it. Failing the run is now the default.
- `--logLevel`: rename it to `--log-level`.
- `runTests`: rename it to `run`, or leave the command out.

The grep stops matching for two other reasons:

- **The messages changed.** A failure now starts with `Couldn't`. A missed `find` reads ``Couldn't find element `Save`.`` or ``Couldn't find an element within `timeout` (5000 ms).``. The summary lists failures under `Failed (N):`, not `Failed Items:`.
- **Logs moved to stderr.** stdout carries only results, so `> dd.log` misses the log lines.

Don't match message text at all. Let the exit code decide instead: `0` means no test failed and at least one passed or warned, `1` means at least one test failed, and `2` means nothing valid was tested, such as an invalid spec or a run where every test skipped. A non-zero exit fails the CI step on its own:

```bash
npx doc-detective run --input docs --log-level info --output results.json
```

For the details, read `results.json`. Each spec, test, context, and step has a `result`, and every failed step has a `resultCode` of `environment`, `drift`, or `assertion`. `--json` prints the same results to stdout instead.
