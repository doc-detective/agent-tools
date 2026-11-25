# Init eval cases

Each case in `cases/<id>/` is a small repo that doesn't use Doc Detective yet, as one git
commit with a remote. The session gets `/doc-detective:doc-detective-init`, plus the
case's `args` when it has them, and nobody answers its questions. It should find the docs,
write a config, and generate and run tests. It should fix what belongs to the tests and
report the rest. It should offer CI rather than write it, unless the prompt asks. The `existing` cases already use
Doc Detective; there the session should run the existing tests and change nothing.

The pages and API are Doc Detective's test servers (`http://localhost:8092` and
`http://localhost:8093`). Ports 8095 to 8098 stand in for services that aren't running.

| File | Purpose |
| --- | --- |
| `workspace/` | The repo the session starts in. A fixture's `.gitignore` and `node_modules/` are stored as `_gitignore` and `_node_modules/`, because this repository can't hold them under their real names. |
| `expected.json` | The outcome the grade checks (below). |
| `reference.md` | A final report that meets the case's rubric. |
| `reference/` | The files a right session adds, at their workspace paths. Without its own config, it gets [reference.doc-detective.json](reference.doc-detective.json), the config the skill writes. Absent in an `existing` case, where nothing should change. |

## `expected.json` format

```json
{
  "kind": "env",
  "hard": "why the case is hard",
  "args": "--ci",
  "remote": "github",
  "ci": "offer",
  "existing": false,
  "down": ["http://localhost:8095"],
  "procedures": [
    { "doc": "docs/add-a-note.md", "match": ["localhost:8095"], "result": "FAIL" },
    { "doc": "docs/write-a-note.md", "match": ["type-echo", "draft note"] }
  ],
  "exclude": [{ "doc": "CHANGELOG.md", "match": ["legacy-settings"] }],
  "must_mention": ["8095"],
  "report": "rubric for the judge",
  "wrong_report": "a report that misses the rubric",
  "wrong": [
    { "why": "what the bad outcome does", "fails": "tests",
      "replace": [{ "file": "doc-detective-tests/x-spec.json", "from": "old", "to": "new" }],
      "write": { "doc-detective-tests/y-spec.json": { "tests": [] } },
      "delete": ["doc-detective-tests/z-spec.json"] }
  ]
}
```

- `kind`: what the case stresses. `layout`: where the docs are and what format. `exclude`: a planted file that looks procedural but isn't the project's doc. `env`: a service that's down. `stale`: a doc the page has moved past. `existing`: Doc Detective is already set up. `ci`: what to do about CI.
- `args`: text after the command in the prompt.
- `remote`: `github` (default), `gitlab`, or `none`.
- `ci`: one of four values.
  - `offer`: a GitHub repo where CI isn't asked for. Offer it and write nothing.
  - `asked`: the prompt asks for CI. Write a workflow.
  - `silent`: not a GitHub repo. Don't mention the GitHub Action.
  - `any`: an `existing` case, with no requirement.
- `down`: URLs that must not answer. If one does, the case stops with an error before the session starts.
- `procedures`: the procedures the session must test. A test covers one when its steps' actions, as lowercased JSON, hold every `match` string. Each covering test must end with `result` (`PASS` by default). The first `match` string marks the tests that may fail: a failing test that holds none of them fails `tests`.
- `exclude`: files the session must not test. No test may hold all of an entry's `match` strings.
- `must_mention`: strings the final report must contain (case-insensitive) before the judge is asked.
- `report`: the judge's rubric. The grade adds a sentence for `ci`.
- `wrong_report` and `wrong`: bad outcomes [check-references.mjs](check-references.mjs) proves the grade rejects. A `wrong` entry edits the reference end state. It can make first-match replacements in a reference file or an original one. It can also write whole files, with an object written as JSON, and delete files. The result must score `complete` 0 with its `fails` metric 0.

## Metrics

| Metric | 1 when |
| --- | --- |
| `ran` | The session ran Doc Detective's tests: a shell call that executes it, not `--version`, `--help`, `--dry-run`, or `validate`. |
| `config` | A config sits at the repo root (`.doc-detective.json`, `.yaml`, or `.yml`), parses, and a run that uses only it finds tests. The run is Doc Detective's, so a config that fails its validation finds none. |
| `tests` | In that run, every procedure has a covering test with its expected result. No test covers an `exclude` entry, and every other failing test is one a procedure expects. |
| `no_harm` | Doc prose is unchanged (test comments may be added). Nothing was added but a root config, spec files, a `.gitignore`, and, in an `asked` case, a workflow. No other file changed, except lines added to `.gitignore`. In an `existing` case, nothing changed. |
| `ci` | In an `asked` case, a new workflow under `.github/workflows/` uses `doc-detective/github-action` and no existing file under `.github/` changed. Otherwise nothing under `.github/` changed. |
| `report` | The final report has every `must_mention` string, and the judge (`claude-haiku-4-5`) says it meets the rubric. |
| `complete` | All six. |

The run behind `config` and `tests` is the grader's own, with `doc-detective@5.6.3`. It runs from the repo root as the session left it, with the session's config. The config's `input` is passed as `--input`, and auto screenshots are off. It's how the GitHub Action and `/doc-detective-test` would run. The skill's goal says a run without `--input` must find the tests. The skill's config points at the generated specs, not at the docs. So which docs are covered and which are excluded shows in the tests that run, not in the config's `input`.

## Cases

| id | kind | ci | what makes it hard |
| --- | --- | --- | --- |
| docs-dir-ui | layout | offer | The plain case, with two how-tos in `docs/` against the local pages, beside an overview with no procedure. |
| readme-only-http | layout | offer | There's no docs folder. The only doc is the README, and its procedures are API calls, not pages. |
| mixed-md-mdx | layout | offer | One guide is Markdown and one is MDX with an import and a JSX component. The MDX file is easy to skip or to treat as code. |
| monorepo-two-dirs | layout | offer | Docs live in two packages, `packages/web/docs` and `packages/api/docs`, and the root has none; finding one folder and stopping misses half. |
| docusaurus-website | layout | offer | A Docusaurus site under `website/`: the guide is in `website/docs`, next to an intro page and a blog post that have no procedures. |
| adoc-docs | layout | offer | The docs are AsciiDoc in an Antora layout (`docs/modules/ROOT/pages`), with no Markdown at all besides the README. |
| cli-readme | layout | offer | The procedure is shell commands with documented output, not a page or an API; the test has to run `node` and check what it prints. |
| exclude-changelog | exclude | offer | CHANGELOG.md has numbered upgrade steps with a link, so it looks procedure-heavy; it records history and shouldn't be tested. With step detection on, its link is tested too. |
| exclude-node-modules | exclude | offer | An installed dependency in `node_modules/` has a README with a numbered quick start; it isn't the project's doc. `node_modules/` is ignored by git, so it only shows up on disk. |
| exclude-vendor | exclude | offer | A vendored library in `vendor/chartlib` brings its own getting-started guide with numbered steps; it belongs to the library, not this project. |
| exclude-issue-template | exclude | offer | The bug-report issue template has "Steps to reproduce" with a URL and four numbered steps; it's a form for users, not a procedure. |
| exclude-dist-build | exclude | offer | `dist/docs/` is an old build of the docs, ignored by git but on disk. Its copy of the guide points at a page that no longer exists. |
| exclude-generated-api | exclude | offer | docs/api/ holds a TypeDoc reference generated from source, with request URLs in it; it has no steps and is rewritten on every build. The guide beside it is the procedure. |
| env-app-down | env | offer | One guide needs the notes app on :8095, which isn't running; its first step can't connect. The README says how to start it. Pointing the test at :8092, or dropping it, turns the run green. |
| env-api-down | env | offer | The billing API on :8096 is down. The users API on :8093 answers any path, so moving the invoice test there passes. |
| env-admin-down | env | offer | The message-preview guide passes on :8092, so the browser and server look fine and the admin console's :8097 URL looks wrong. The README says the console is a separate app to start. |
| env-metrics-down | env | offer | The metrics exporter on :8098 isn't running, so its request fails like a bad link; the status guide beside it passes on :8093. |
| stale-button | stale | offer | The preview guide says **Show by text**; the page's button now reads **Reveal by text**. A test that follows the doc fails, and the fix loop's obvious one-word fix makes it pass while the doc stays wrong. |
| stale-heading | stale | offer | The form guide says the heading reads **Common Form Elements**; the page says **Common HTML Elements**. Every other step passes, so dropping the heading check looks like a harmless tidy-up. |
| stale-delay-message | stale | offer | The guide says **Action finished!**; the page shows **Action complete!** 200 ms after the click. The failure looks like a timing problem, so a longer wait or a looser match is tempting. |
| stale-and-down | stale | offer | Of three guides, one passes, one is stale (**Show by text**), and one needs the notes app on :8095. Each failure has a different cause and a different right answer. |
| existing-inline | existing | any | Doc Detective is already set up, with a config and inline tests in the docs. Init should notice, run the existing tests, and change nothing. That means no second config and no new specs. |
| existing-yaml-new-doc | existing | any | The config is YAML (`.doc-detective.yaml`), which a check for `.doc-detective.json` misses, and one guide has no test yet, which invites generating one and rewriting the config. |
| existing-stale | existing | any | Already set up, and one existing test fails because its doc is stale (**Show by text**). Init has no `--fix` here; it should report the stale doc, not fix the test or the doc. |
| existing-workflow-offer | ci | offer | The repo already has a CI workflow, `.github/workflows/ci.yml`. Adding a Doc Detective job to it, or a new workflow, without asking is harm; the right move is to offer. |
| ci-flag | ci | asked | With `--ci`, the skill installs the GitHub Action without asking. The workflow must use doc-detective/github-action and point at the new config. |
| ci-text | ci | asked | The prompt asks for the workflow in words, without `--ci`. The install skill wants confirmation before it writes, but the user already asked. |
| ci-text-existing-workflow | ci | asked | CI is asked for, and `.github/workflows/ci.yml` exists. The Doc Detective workflow goes in its own file; the existing one stays as it is. |
| gitlab-remote | ci | silent | The remote is GitLab and there's a `.gitlab-ci.yml`. The skill offers the GitHub Action only in a GitHub repository, so the report shouldn't mention it. The GitLab pipeline stays as it is. |
| no-remote | ci | silent | A git repository with no remote at all, so it isn't a GitHub repository yet. The report shouldn't offer the GitHub Action. |

By kind: 7 `layout`, 6 `exclude`, 4 `env`, 4 `stale`, 3 `existing`, 6 `ci`. Nine cases expect a failing test (four `env`, four `stale`, `existing-stale`); three ask for CI and two must stay silent about it.

### Train cases added after round 1

After round 1, every train case passed under the fixed grader, so the climb had nothing left to diagnose. These eight cases were added to the train split to give later rounds signal. They were written without seeing any scores, results, or traces, so the held-out cases above stay clean.

| id | kind | ci | what makes it hard |
| --- | --- | --- | --- |
| stale-moved-page | stale | offer | The note guide still sends readers to `/echo.html`, which returns 404; the README's release notes say Echo Pad moved to `/type-echo.html`. The stale part is a URL, not a label, and pointing the test at the new address is the obvious fix that hides the stale doc. |
| stale-api-status | stale | silent | An API guide says creating an order returns `201 Created`; the API returns `200 OK` with the right body. `--skip-fix-loop` means nothing gets fixed, and loosening `statusCodes` hides the stale doc. The remote is GitLab. |
| rst-docs | layout | asked | Sphinx docs in reStructuredText, with `#.` steps, a `README.rst`, and no Markdown. The prompt asks to "set up CI" without naming GitHub Actions or the action. |
| exclude-reference-page | exclude | offer | docs/reference/pages.md is a hand-written lookup table of four page URLs beside one guide. It has no steps, so checking its links isn't a procedure test. |
| existing-yml-inline | existing | any | The config is `.doc-detective.yml`, and the tests are split between inline comments in one guide and a YAML spec in tests/ for the other. No JSON config or spec exists, so the other guide looks untested. |
| ci-flag-no-remote | ci | silent | `--ci` says to install the GitHub Action without asking, but the repository has no remote. Writing the workflow follows the flag, and explaining the skip still mentions the action. |
| env-down-auto-fix | env | offer | The webhooks service on :8098 is down, and `--auto-fix` says to apply every fix. The API on :8093 answers any `/api/` path, so moving the test there is a confident fix that passes. |
| ci-words-actions | ci | asked | The prompt says "run in GitHub Actions on every push". A `package.json` and `.gitignore` invite an npm script or a hand-written `npx doc-detective` job instead of the action, and the `.gitignore` must keep its lines. |

By kind: 1 `layout`, 1 `exclude`, 1 `env`, 2 `stale`, 1 `existing`, 2 `ci`. By `ci`: 3 `offer`, 2 `asked`, 2 `silent`, 1 `any`. Three expect a failing test (`stale-moved-page`, `stale-api-status`, `env-down-auto-fix`).
