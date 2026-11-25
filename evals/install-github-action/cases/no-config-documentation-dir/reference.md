Added `.github/workflows/doc-detective.yml`.

The repository has no Doc Detective config, so the workflow points the action's `input` at `documentation/`, where the docs and their inline tests are. It runs on every pull request with a read-only token.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- The workflow runs only on pull requests, and GitHub shares a pull request's cache only with that pull request. To let every pull request reuse one cache of Doc Detective and its browsers, add a `push` trigger on `main`.
