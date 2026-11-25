Added `.github/workflows/doc-detective.yml`.

The tests in `docs/ios-onboarding.md` run on iOS, and iOS simulators run only on macOS, so the job uses `macos-latest`. It runs on pull requests and on pushes to `main`; the push run saves the action's cache, including the WebDriverAgent build, for pull requests to restore.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
