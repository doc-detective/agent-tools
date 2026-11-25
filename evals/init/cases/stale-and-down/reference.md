I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/write-a-note-spec.json` tests docs/write-a-note.md; `doc-detective-tests/preview-a-message-spec.json` tests docs/preview-a-message.md; `doc-detective-tests/add-a-note-spec.json` tests docs/add-a-note.md.

Results: 1 passed, 2 failed, for different reasons.

- write-a-note passed.
- preview-a-message: the doc is out of date. It says to click **Show by text**, but the button reads **Reveal by text**. Proposed doc edit, step 2: "Click **Reveal by text**." Should I apply it? I didn't change the test.
- add-a-note: an environment problem. Nothing runs on http://localhost:8095; start Acme Notes with `npm run dev` in the acme-notes repository, then run the tests again.

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
