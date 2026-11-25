Added `.github/workflows/doc-detective.yml`.

It runs Doc Detective on pull requests only, with `.doc-detective.json` and a read-only token. Pushes don't trigger it.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- Each new pull request's first run installs Doc Detective and its browsers, because GitHub shares a pull request's cache only with that pull request. A `push` trigger on `main` would save a shared cache; say if you want it.
