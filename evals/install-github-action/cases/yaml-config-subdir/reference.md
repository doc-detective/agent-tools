Added `.github/workflows/doc-detective.yml`.

The config is `site/.doc-detective.yml`, so the action runs in `site/` (`working_directory: site`) with `config: .doc-detective.yml`, which resolves to that file. It tests the handbook in `site/`, the way the README runs it, on every pull request with a read-only token.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- The workflow runs only on pull requests, and GitHub shares a pull request's cache only with that pull request. To let every pull request reuse one cache of Doc Detective and its browsers, add a `push` trigger on `main`.
