I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/readme-spec.json` tests README.md.

README.md's "Try it" steps run `node scripts/greet.js`; the test runs both commands and checks they print `Hello, Ada!` and `Hello, world!`.

Results: 1 passed, 0 failed.

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
