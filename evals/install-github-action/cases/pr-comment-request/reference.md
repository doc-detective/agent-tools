Added `.github/workflows/doc-detective.yml`. It runs Doc Detective on every pull request with `.doc-detective.json`.

The Doc Detective action has no input that posts results as a pull request comment, so the workflow doesn't comment. The results show in the check, and the action exposes them as its `results` output. If you want a comment, I can add an `actions/github-script` step that reads that output and comments, which also needs `pull-requests: write`.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- The workflow runs only on pull requests, and GitHub shares a pull request's cache only with that pull request. To let every pull request reuse one cache of Doc Detective and its browsers, add a `push` trigger on `main`.
