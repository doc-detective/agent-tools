I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/preview-a-message-spec.json` tests docs/preview-a-message.md.

The one guide is docs/preview-a-message.md. I left node_modules/ alone: it holds installed dependencies, not this project's docs.

Results: 1 passed, 0 failed.

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
