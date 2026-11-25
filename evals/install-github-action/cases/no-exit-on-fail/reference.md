Added `.github/workflows/doc-detective.yml`.

It runs Doc Detective on every pull request with `.doc-detective.json`. With `exit_on_fail: false`, failing tests don't fail the check; read the results in the job log. The job still fails when nothing valid was tested.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- The workflow runs only on pull requests, and GitHub shares a pull request's cache only with that pull request. To let every pull request reuse one cache of Doc Detective and its browsers, add a `push` trigger on `main`.
