No setting turns folder mode back on. In version 5, `--output` and the `output` config key always name the JSON results file. Doc Detective overwrites it on each run, and a folder, or a path ending in a slash, exits `2`.

Give it a file path, and upload that one file instead of a glob:

```bash
npx doc-detective --input docs --output reports/results.json
```

`--output-dir` is the folder flag, but it doesn't bring the glob back. It sets `outputDir`, the folder that holds the run folder, `reports/.doc-detective/runs/<runId>/testResults.json`, and the HTML, JUnit, and Markdown reports. The default reporters are `terminal` and `runFolder`. A timestamped `testResults-*.json` file appears only when the `json` reporter runs, as with `--reporters terminal,json`. A fixed `--output` path is simpler for an artifact upload.
