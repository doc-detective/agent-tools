The `-` comes from your config. An `output` of `-` in config means stdout, exactly like `--output -` on the command line.

Only one output mode can write stdout at a time. `--plain` can't combine with `--output -`, `--json`, or `--dry-run`, whether each comes from a flag or from config (`output: "-"`, `dryRun: true`). Doc Detective refuses the pair and exits `2` before it runs any test.

Locally, give the run a results file:

```bash
npx doc-detective --plain --output results.json
```

The `--output` flag beats the config key, so stdout gets the plain lines and `results.json` gets the results. The config keeps `"output": "-"`, so the CI job still pipes JSON into `jq`.
