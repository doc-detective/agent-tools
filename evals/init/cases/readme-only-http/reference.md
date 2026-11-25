I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/readme-spec.json`.

The only documentation is README.md. Its two requests, creating an order and listing users, are tested against `http://localhost:8093`.

Results: 2 passed, 0 failed.

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
