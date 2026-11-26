I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/add-a-note-spec.json` tests docs/add-a-note.md; `doc-detective-tests/write-a-note-spec.json` tests docs/write-a-note.md.

Results: 1 passed, 1 failed.

- write-a-note passed.
- add-a-note failed: Couldn't open http://localhost:8095/notes (connection refused). Nothing is running on port 8095. This is an environment problem, not the doc or the test: the README says to start the Acme Notes app with `npm run dev` in the acme-notes repository. Start it and run the tests again. I left the test as the doc describes it.

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
