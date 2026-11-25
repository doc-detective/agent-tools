I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/create-an-invoice-spec.json` tests docs/create-an-invoice.md; `doc-detective-tests/list-users-spec.json` tests docs/list-users.md.

Results: 1 passed, 1 failed.

- list-users passed.
- create-an-invoice failed: the POST to http://localhost:8096/api/invoices couldn't connect. The billing API isn't running. That's the environment, not the doc or the test. Start it with `docker compose up billing-api`, as the README says, and run the tests again.

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
