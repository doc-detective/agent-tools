Added `.github/workflows/doc-detective.yml`.

It runs Doc Detective every night at 2:00 UTC (`cron: '0 2 * * *'`), and you can start it by hand from the **Actions** tab (`workflow_dispatch`). It uses `.doc-detective.json` and a read-only token. Scheduled runs use the workflow file on the default branch.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
