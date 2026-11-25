I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/run-a-delayed-action-spec.json` tests docs/run-a-delayed-action.md; `doc-detective-tests/pick-an-option-spec.json` tests docs/pick-an-option.md.

Results: 1 passed, 1 failed.

- pick-an-option passed.
- run-a-delayed-action failed: Couldn't find `Action finished!`. After the click, the page shows **Action complete!**. It isn't a timing problem: the doc's message is out of date. Proposed doc edit, step 3: "Wait for the message **Action complete!**". Should I apply it?

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
