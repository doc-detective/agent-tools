I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/check-the-status-spec.json` tests docs/check-the-status.md; `doc-detective-tests/read-the-metrics-spec.json` tests docs/read-the-metrics.md.

Results: 1 passed, 1 failed.

- check-the-status passed.
- read-the-metrics failed: GET http://localhost:8098/metrics couldn't connect. The metrics exporter isn't running. Start it with `docker compose up metrics`, as the README says, and run the tests again. The doc and test are fine.

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
