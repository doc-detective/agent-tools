Added `.github/workflows/doc-detective.yml`.

It runs Doc Detective every Monday at 6:00 UTC (`cron: '0 6 * * 1'`), with `.doc-detective.json` and a read-only token. Change the `cron` line to run it at another time.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
