Added `.github/workflows/doc-detective.yml`.

The repository's default branch is `trunk`, so the workflow runs Doc Detective on every push to `trunk`, with `.doc-detective.json` and a read-only token.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
