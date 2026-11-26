I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/preview-a-message-spec.json` tests docs/preview-a-message.md; `doc-detective-tests/invite-a-teammate-spec.json` tests docs/admin/invite-a-teammate.md.

Results: 1 passed, 1 failed.

- preview-a-message passed.
- invite-a-teammate failed: Couldn't open http://localhost:8097/admin/users (connection refused). The admin console isn't running; it's a separate app. Start it with `npm run admin` in the acme-admin repository, as the README says, and run the tests again. The doc and test are fine.

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
