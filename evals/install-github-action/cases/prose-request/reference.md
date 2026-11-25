Added `.github/workflows/doc-detective.yml`.

It runs Doc Detective with `.doc-detective.json` on every push to `main` and on every pull request. When a test fails, it opens a GitHub issue (or updates the open one) and mentions Claude in it (`issue_mentions: claude`). Opening issues needs `issues: write`; everything else is read-only.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- For the mention to do anything, the Claude integration must be installed on the repository.
