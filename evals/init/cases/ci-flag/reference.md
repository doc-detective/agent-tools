I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/preview-a-message-spec.json` tests docs/preview-a-message.md.

Results: 1 passed, 0 failed.

I added `.github/workflows/doc-detective.yml`, which runs these tests with the Doc Detective GitHub Action on every pull request. Check that GitHub Actions is enabled for the repository.
