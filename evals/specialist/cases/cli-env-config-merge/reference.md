The job's `reporters` list is just `html`, and the HTML report lands in `reports/`.

The shell's value wins over `.env`. A `.env` file only fills variables the shell left unset, so its markdown setting doesn't apply in that job.

`DOC_DETECTIVE_CONFIG` ranks above the project config and merges into it deeply. Objects merge key by key, but arrays replace. So `reporters` becomes `["html"]` alone. The job prints no terminal summary and writes no `junit.xml`.

Keys the variable doesn't set still come from `.doc-detective.json`. `outputDir` stays `reports`, so the HTML report is `reports/testResults-<runId>.html`. While `autoScreenshot` or `autoRecord` is on, the run folder still appears under `reports/.doc-detective/runs/`.

To add HTML to the other two, list all three:

- `DOC_DETECTIVE_CONFIG='{"reporters":["terminal","junit","html"]}'`
- Or pass the flag, which beats every config layer: `npx doc-detective --reporters terminal,junit,html`.
