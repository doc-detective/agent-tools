I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/register-a-webhook-spec.json` tests docs/register-a-webhook.md; `doc-detective-tests/look-up-an-order-spec.json` tests docs/look-up-an-order.md.

Results: 1 passed, 1 failed.

- look-up-an-order passed.
- register-a-webhook failed: Couldn't connect to http://localhost:8098/api/webhooks (connection refused). Nothing is running on port 8098. This is an environment problem, not the doc or the test: the README says to start the webhooks service with `docker compose up hooks` in the acme-hooks repository. Start it and run the tests again. `--auto-fix` applies fixes to tests that don't match their docs; this test matches its doc, so there was nothing to fix, and I left it as the doc describes it.

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
