Added `.github/workflows/doc-detective.yml`.

It runs Doc Detective on every pull request with `.doc-detective.json`. `docs/list-orders.md` sends `$API_KEY`, so the job sets `API_KEY` from a repository secret. Doc Detective masks its value in logs and results.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- Add a repository secret named `API_KEY` (**Settings** > **Secrets and variables** > **Actions**). Without it, the API test fails.
