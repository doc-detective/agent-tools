I set up Doc Detective in this repository.

- Config: `.doc-detective.json`, which runs the specs in `doc-detective-tests/` and writes results to `.doc-detective/results/`. I added `.doc-detective/` to `.gitignore`.
- Specs: `doc-detective-tests/subscribe-to-updates-spec.json` tests docs/subscribe-to-updates.md.

Results: 1 passed, 0 failed (sign-up).

As you asked, I added `.github/workflows/doc-detective.yml`. It runs these tests with the Doc Detective GitHub Action (`doc-detective/github-action`) on every push and pull request. Check that GitHub Actions is enabled for the repository.
