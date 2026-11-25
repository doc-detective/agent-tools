Added `.github/workflows/doc-detective.yml`.

It runs Doc Detective on every pull request with `.doc-detective.json`. When a test fails, it opens a GitHub issue with the `DOCS_BOT_TOKEN` secret (`token: ${{ secrets.DOCS_BOT_TOKEN }}`).

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- Make sure the repository has a `DOCS_BOT_TOKEN` secret (**Settings** > **Secrets and variables** > **Actions**), and that the token can create issues in this repository.
