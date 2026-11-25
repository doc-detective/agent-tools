Added `.github/workflows/doc-detective.yml`.

On every pull request it installs dependencies, starts the app with `npm run dev` in the background, waits for http://localhost:5173 to answer, and then runs Doc Detective with `.doc-detective.json`. The doc tests open that URL, so they need the app running.

Next steps:
- Commit and push `.github/workflows/doc-detective.yml`. The workflow runs once it's on GitHub.
- Confirm that GitHub Actions is enabled for the repository: **Settings** > **Actions** > **General**.
- The workflow runs only on pull requests, and GitHub shares a pull request's cache only with that pull request. To let every pull request reuse one cache of Doc Detective and its browsers, add a `push` trigger on `main`.
