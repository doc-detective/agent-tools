Added `.github/workflows/doc-detective.yml`.

It runs Doc Detective on every push to `main` with `.doc-detective.json`. When a run changes files, such as updated screenshots, the action opens a pull request with the changes. That needs `contents: write` and `pull-requests: write`.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- In **Settings** > **Actions** > **General**, select **Allow GitHub Actions to create and approve pull requests**. Without it, the default token can't open the pull request. In an organization, an owner must allow it first.
- Each run force-pushes one branch, `doc-detective-changes`, and updates its open pull request. Don't commit to that branch by hand. By default the pull request commits every changed file, including screenshots; set `pr_paths` to limit it.
