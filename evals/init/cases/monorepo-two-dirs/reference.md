I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/write-a-note-spec.json` tests packages/web/docs/write-a-note.md; `doc-detective-tests/create-an-order-spec.json` tests packages/api/docs/create-an-order.md.

Docs live in two packages: packages/web/docs (write-a-note.md) and packages/api/docs (create-an-order.md).

Results: 2 passed, 0 failed.

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
