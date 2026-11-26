I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/write-a-note-spec.json` tests docs/write-a-note.md; `doc-detective-tests/preview-a-message-spec.json` tests docs/preview-a-message.md.

Results: 1 passed, 1 failed.

- add-a-sample-message (preview-a-message) passed.
- check-a-note (write-a-note) failed: Couldn't find element `#type-input` at http://localhost:8092/echo.html. That address returns 404 Not Found: the README's notes for 2.0 say Echo Pad moved to `/type-echo.html`. The test follows the doc, so docs/write-a-note.md is out of date. I didn't change the test, because pointing it at the new page would hide the stale doc. Proposed doc edit, step 1: "Go to http://localhost:8092/type-echo.html." Should I apply it and update the test?

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
