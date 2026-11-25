Added `.github/workflows/doc-detective.yml`.

It runs Doc Detective from `docs/` with `docs/.doc-detective.json` on every pull request, then uploads `docs/.doc-detective/runs/`, which holds each run's screenshots, as the `doc-detective-run` artifact, even when tests fail.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- The workflow runs only on pull requests, and GitHub shares a pull request's cache only with that pull request. To let every pull request reuse one cache of Doc Detective and its browsers, add a `push` trigger on `main`.
