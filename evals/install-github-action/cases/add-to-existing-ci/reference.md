Added Doc Detective as its own workflow, `.github/workflows/doc-detective.yml`. I left your `ci.yml` unchanged: it runs on Node.js 20, and Doc Detective 5 needs Node.js 24, so a separate workflow keeps your SDK tests as they are.

It runs Doc Detective with `.doc-detective.json` on the same events as `ci.yml`, every pull request and every push to `main`, with a read-only token. Both show up as checks on each pull request.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
