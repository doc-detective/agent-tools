Doc Detective is already set up here: `.doc-detective.json` runs the specs in tests/. I didn't initialize it again, and ran the existing tests.

Results: 1 passed, 1 failed.

- check-a-note passed.
- add-a-sample-message failed: Couldn't find element `Show by text`. The page's button now reads **Reveal by text**, so docs/preview-a-message.md is out of date (the test follows it). Proposed doc edit, step 2: "Click **Reveal by text**." Should I apply it and update the test? I haven't changed any files.
