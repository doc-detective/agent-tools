Added `.github/workflows/doc-detective.yml`.

It runs Doc Detective on pull requests that change something under `packages/docs/` (a `paths` filter), from `packages/docs` with its `.doc-detective.json`. Changes to `packages/api` or `packages/web` alone don't trigger it.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- The workflow runs only on pull requests, and GitHub shares a pull request's cache only with that pull request. To let every pull request reuse one cache of Doc Detective and its browsers, add a `push` trigger on `main`.
