I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/preview-a-message-spec.json` tests docs/preview-a-message.md; `doc-detective-tests/write-a-note-spec.json` tests docs/write-a-note.md.

Results: 1 passed, 1 failed.

- write-a-note passed.
- preview-a-message failed: Couldn't find element `Show by text`. The page's button now reads **Reveal by text**. The test follows the doc, so the doc is what's out of date. I didn't change the test, because making it pass would hide the problem. Proposed doc edit, step 2: "Click **Reveal by text**." Should I apply it and update the test?

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
