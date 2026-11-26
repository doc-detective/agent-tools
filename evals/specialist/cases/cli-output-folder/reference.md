In Doc Detective 5, `--output`, like the config key `output`, names the JSON results file itself, not a folder. Doc Detective overwrites that file on each run. A folder that exists, or a path that ends in a slash, is a usage error, so the run exits `2` before any test runs.

Give `--output` a file path inside `reports/`:

```bash
npx doc-detective --input docs --output reports/results.json
```

Doc Detective creates `reports/` if it's missing, and the upload step finds the results at `reports/results.json`.

`--output-dir` is the folder flag. It sets where the run folder (`.doc-detective/runs/<runId>/`) and the `html`, `junit`, and `markdown` reports go. With the default reporters, the results then sit at `reports/.doc-detective/runs/<runId>/testResults.json`, a path that changes on every run. To keep the run folder and the results file under `reports/`, pass both flags:

```bash
npx doc-detective --input docs --output reports/results.json --output-dir reports
```

Watch the clean-checkout case. A path that doesn't exist and has no trailing slash becomes a file, even with no extension. If `reports/` is missing, `--output ./reports` doesn't fail. It writes the results to a file named `reports`.
