Added `.github/workflows/doc-detective.yml`.

It runs Doc Detective on every pull request with `.doc-detective.json`, and opens a pull request when a run changes files.

A warning about `pull_request`: the action builds its branch from the source pull request's merge commit, so the pull request it opens carries the source pull request's changes too. Every source pull request also overwrites the same branch, `doc-detective-changes`. To avoid both, trigger PR creation on pushes to `main` instead.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- In **Settings** > **Actions** > **General**, select **Allow GitHub Actions to create and approve pull requests**. Without it, the default token can't open the pull request. In an organization, an owner must allow it first.
