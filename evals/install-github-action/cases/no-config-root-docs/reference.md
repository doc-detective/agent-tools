Added `.github/workflows/doc-detective.yml`.

The repository has no Doc Detective config and no docs folder; the tests are in `README.md` and `INSTALL.md` at the root. The action's defaults test the root, so the workflow sets no inputs. It runs on every pull request with a read-only token.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- The workflow runs only on pull requests, and GitHub shares a pull request's cache only with that pull request. To let every pull request reuse one cache of Doc Detective and its browsers, add a `push` trigger on `main`.
