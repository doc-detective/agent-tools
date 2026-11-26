I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/create-an-order-spec.json` tests docs/create-an-order.md; `doc-detective-tests/list-users-spec.json` tests docs/list-users.md.

Results: 1 passed, 1 failed. I skipped the fix loop, as `--skip-fix-loop` asks.

- list-users passed.
- create-an-order failed: the API responded `200 OK`, and docs/create-an-order.md says it responds `201 Created`. The rest of the response matched: the body echoed the `sku` and `quantity`. The test follows the doc, so the doc is out of date. I didn't change the test. Proposed doc edit, step 2: "Check that the API responds with `200 OK`." Should I apply it and update the test?
