I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/write-a-note-spec.json` tests docs/write-a-note.rst; `doc-detective-tests/preview-a-message-spec.json` tests docs/preview-a-message.rst.

The docs are reStructuredText pages for Sphinx in docs/. I skipped docs/overview.rst, which has no steps, and docs/index.rst, which is the table of contents.

Results: 2 passed, 0 failed (check-a-note, add-a-sample-message).

For CI, I added `.github/workflows/doc-detective.yml`, which runs these tests with the Doc Detective GitHub Action on every pull request. Check that GitHub Actions is enabled for the repository.
