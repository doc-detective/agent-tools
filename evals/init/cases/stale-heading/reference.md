I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`.
- Specs: `doc-detective-tests/fill-in-the-profile-form-spec.json` tests docs/fill-in-the-profile-form.md.

Results: 0 passed, 1 failed.

- fill-in-the-profile-form failed: Couldn't find `Common Form Elements`. The page heading reads **Common HTML Elements**. The doc's step 1 is out of date; the test checks what the doc says. Proposed doc edit, step 1: "The page heading reads **Common HTML Elements**." Should I apply it?

This is a GitHub repository. Do you want me to add the Doc Detective GitHub Action, so these tests run on every pull request?
