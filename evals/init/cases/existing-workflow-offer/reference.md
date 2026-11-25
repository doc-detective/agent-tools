I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/write-a-note-spec.json` tests docs/write-a-note.md.

Results: 1 passed, 0 failed.

You already have a CI workflow (.github/workflows/ci.yml); I left it alone. Do you want me to add the Doc Detective GitHub Action as its own workflow, so these tests run on every pull request?
