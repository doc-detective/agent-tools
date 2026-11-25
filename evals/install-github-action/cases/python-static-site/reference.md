Added `.github/workflows/doc-detective.yml`.

On every pull request it serves `public/` with `python3 -m http.server 8000 --directory public` in the background, waits for http://localhost:8000 to answer, and then runs Doc Detective with `.doc-detective.json`. The doc tests open that URL, so they need the site served. The site is static HTML, so there's nothing to install or build first; GitHub's Ubuntu runners already have Python 3.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- The workflow runs only on pull requests, and GitHub shares a pull request's cache only with that pull request. To let every pull request reuse one cache of Doc Detective and its browsers, add a `push` trigger on `main`.
