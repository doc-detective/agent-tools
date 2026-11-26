Added `.github/workflows/doc-detective.yml`.

It runs Doc Detective on every push to `main` with `.doc-detective.json`. When a test fails, it opens a GitHub issue (or updates the open one) and mentions Claude and Copilot in it (`issue_mentions: claude,copilot`). Issue creation needs `issues: write`; everything else is read-only.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- For the mentions to do anything, the Claude and Copilot integrations must be installed on the repository.
