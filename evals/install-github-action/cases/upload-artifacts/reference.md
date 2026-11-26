Added `.github/workflows/doc-detective.yml`.

It runs Doc Detective on every pull request with `.doc-detective.json`, then uploads the run folder, `.doc-detective/runs/`, as the `doc-detective-run` artifact. The upload runs even when tests fail (`if: always()`), and `include-hidden-files: true` keeps upload-artifact from skipping the dot folder. Download it from the run's **Summary** page.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- The workflow runs only on pull requests, and GitHub shares a pull request's cache only with that pull request. To let every pull request reuse one cache of Doc Detective and its browsers, add a `push` trigger on `main`.
