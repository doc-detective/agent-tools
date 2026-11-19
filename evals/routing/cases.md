# Routing eval cases (52)

Each case is one request sent to Claude Code with only this plugin loaded. `expected` is the one correct route (the headline score). Routes in `also accepted` count only toward the secondary lenient score. `none` means no skill and no Doc Detective agent should be invoked.

| id | expected | also accepted | workspace | source | difficulty |
|---|---|---|---|---|---|
| real-inline-page | doc-detective-inject | doc-detective-inline-test-injection, doc-detective-doc-testing | docs-project | real | easy |
| real-inline-api | doc-detective-inject | doc-detective-inline-test-injection, doc-detective-doc-testing | docs-project | real | easy |
| real-ci-single-action | doc-detective-install-github-action | - | configured-project | real | easy |
| real-ci-make-sure | doc-detective-install-github-action | - | configured-project | real | hard |
| real-run-yourself | doc-detective-test | doc-detective-doc-testing | configured-project | real | easy |
| real-authoritative-gate | doc-detective-test | doc-detective-doc-testing | configured-project | real | hard |
| real-valid-or-invalid | doc-detective-validate | - | configured-project | real | easy |
| real-comment-syntax | agent:doc-detective-specialist | doc-detective-inline-test-injection, doc-detective-inject, doc-detective-doc-testing, none | empty | real | easy |
| real-map-instructions | doc-detective-generate | doc-detective-doc-testing, agent:doc-detective-specialist | empty | real | easy |
| real-author-guide-tests | doc-detective-generate | doc-detective-doc-testing | docs-project | real | easy |
| neg-dev-claude-md | none | - | docs-project | real | hard |
| neg-dev-bootstrap-guardrails | none | - | docs-project | real | hard |
| neg-dev-rename-workflow | none | - | configured-project | real | hard |
| neg-dev-v2-regression | none | - | empty | real | hard |
| neg-dev-monitor-pr | none | - | empty | real | hard |
| neg-dev-talk | none | agent:doc-detective-specialist | empty | real | hard |
| init-plain | doc-detective-init | doc-detective-project-bootstrap | docs-project | variant | easy |
| init-start-testing | doc-detective-init | doc-detective-project-bootstrap | docs-project | variant | easy |
| init-lowercase | doc-detective-init | doc-detective-project-bootstrap | docs-project | variant | hard |
| init-adopted | doc-detective-init | doc-detective-project-bootstrap | docs-project | variant | hard |
| gen-dont-run | doc-detective-generate | doc-detective-doc-testing | docs-project | variant | easy |
| gen-review-json | doc-detective-generate | doc-detective-doc-testing | docs-project | variant | easy |
| gen-api-to-tests | doc-detective-generate | doc-detective-doc-testing | docs-project | variant | easy |
| gen-run-later | doc-detective-generate | doc-detective-doc-testing | docs-project | variant | hard |
| test-plain | doc-detective-test | doc-detective-doc-testing | configured-project | variant | easy |
| test-still-work | doc-detective-test | doc-detective-doc-testing | configured-project | variant | easy |
| test-run-and-fix | doc-detective-test | doc-detective-doc-testing | configured-project | variant | easy |
| test-release | doc-detective-test | doc-detective-doc-testing | configured-project | variant | hard |
| test-matches-app | doc-detective-test | doc-detective-doc-testing | docs-project | variant | hard |
| val-spec-file | doc-detective-validate | - | configured-project | variant | easy |
| val-config | doc-detective-validate | - | configured-project | variant | easy |
| val-before-commit | doc-detective-validate | - | empty | variant | easy |
| val-will-it-accept | doc-detective-validate | - | empty | variant | hard |
| inj-from-spec | doc-detective-inject | doc-detective-inline-test-injection | configured-project | variant | easy |
| inj-api | doc-detective-inject | doc-detective-inline-test-injection | docs-project | variant | easy |
| inj-move-into-md | doc-detective-inject | doc-detective-inline-test-injection | configured-project | variant | hard |
| inj-self-testing | doc-detective-inject | doc-detective-inline-test-injection | docs-project | variant | hard |
| gha-every-pr | doc-detective-install-github-action | - | configured-project | variant | easy |
| gha-nightly | doc-detective-install-github-action | - | configured-project | variant | easy |
| gha-open-issue | doc-detective-install-github-action | - | configured-project | variant | hard |
| concept-spec-vs-inline | agent:doc-detective-specialist | doc-detective-doc-testing, none | empty | variant | easy |
| concept-file-scanning | agent:doc-detective-specialist | doc-detective-doc-testing, none | empty | variant | easy |
| concept-why | agent:doc-detective-specialist | doc-detective-doc-testing, none | empty | variant | easy |
| neg-unit-tests | none | - | docs-project | variant | easy |
| neg-typo | none | - | docs-project | variant | easy |
| neg-playwright | none | - | docs-project | variant | hard |
| neg-ci-npm-test | none | - | docs-project | variant | hard |
| neg-proofread | none | - | docs-project | variant | easy |
| neg-openapi | none | - | docs-project | variant | hard |
| neg-reference-docs | none | - | docs-project | variant | easy |
| neg-write-tutorial | none | - | docs-project | variant | hard |
| neg-vitepress | none | - | docs-project | variant | hard |

## Requests

### real-inline-page

```text
choose a docs page and write doc detecrive inline tests for it.
```

### real-inline-api

```text
write Doc Detective tests for docs/api.md. Every API call should have a valid, inline Doc Detective test.
```

### real-ci-single-action

```text
For CI I want just a single Doc Detective action that picks up and runs all tests from the docs.
```

### real-ci-make-sure

```text
Make sure our CI actually runs Doc Detective tests against the docs.
```

### real-run-yourself

```text
Run the Doc Detective tests in this repo yourself and tell me what fails.
```

### real-authoritative-gate

```text
Doc Detective needs to be the authoritative gate for these docs. Run it against docs/ and show me which procedures break.
```

### real-valid-or-invalid

```text
Can I inject this test spec into documentation? {"notTests":[{"steps":[{"goTo":"http://localhost:8092"}]}]} Just say VALID or INVALID.
```

### real-comment-syntax

```text
What comment syntax should I use for injecting Doc Detective steps into .md, .mdx, and .adoc files?
```

### real-map-instructions

```text
Given this documentation: 'Navigate to https://example.com, click the Login button, and verify the dashboard appears.' What Doc Detective actions would each instruction map to?
```

### real-author-guide-tests

```text
Author Doc Detective tests for the getting started guide.
```

### neg-dev-claude-md

```text
Bootstrap a CLAUDE.md for this repo that ports the conventions and behaviors of ../doc-detective.
```

### neg-dev-bootstrap-guardrails

```text
bootstrap this repo with infrastrucrure, guidelines, and gaurdrails found in ../doc-detective
```

### neg-dev-rename-workflow

```text
Rename the `doc-detective` workflow to something more meaningful.
```

### neg-dev-v2-regression

```text
doc detective should still be supporting the v2 schema syntax. this is a regression.
```

### neg-dev-monitor-pr

```text
run the monitor-pr skill from ../doc-detective on PR 554
```

### neg-dev-talk

```text
I need to present Docs as Tests to a group of documentation managers. Help me outline a 20-minute talk.
```

### init-plain

```text
Set up Doc Detective in this repo.
```

### init-start-testing

```text
I want to start testing our docs. Can you get Doc Detective configured here and write a first round of tests?
```

### init-lowercase

```text
get docs-as-tests going for this project
```

### init-adopted

```text
We just adopted Doc Detective. Add whatever config it needs and make sure the getting-started guide passes.
```

### gen-dont-run

```text
Generate a Doc Detective test spec from docs/getting-started.md. Don't run it.
```

### gen-review-json

```text
Turn the steps in docs/getting-started.md into a test spec JSON file I can review.
```

### gen-api-to-tests

```text
Convert our API page into Doc Detective tests and save them under tests/.
```

### gen-run-later

```text
Draft tests for the widget creation procedure. I'll run them myself later.
```

### test-plain

```text
Run the Doc Detective tests.
```

### test-still-work

```text
Do the procedures in docs/getting-started.md still work? Test them.
```

### test-run-and-fix

```text
Run tests/login.spec.json and fix whatever fails.
```

### test-release

```text
Our release is tomorrow. Verify every documented procedure in this repo actually works.
```

### test-matches-app

```text
Check that the procedure in docs/getting-started.md matches what the app actually does.
```

### val-spec-file

```text
Is tests/login.spec.json a valid Doc Detective spec?
```

### val-config

```text
Check my .doc-detective.json config for errors.
```

### val-before-commit

```text
Validate this spec before I commit it: {"tests":[{"steps":[{"action":"goTo","url":"http://localhost:8092"}]}]}
```

### val-will-it-accept

```text
Will Doc Detective accept this config? {"input": "docs/", "recursive": "yes"}
```

### inj-from-spec

```text
Put the tests from tests/login.spec.json into docs/getting-started.md as inline comments.
```

### inj-api

```text
Inject inline Doc Detective tests into docs/api.md.
```

### inj-move-into-md

```text
Instead of a separate spec file, I want the tests to live inside the markdown. Move them in.
```

### inj-self-testing

```text
Add test comments next to each step in the getting started guide so the doc tests itself.
```

### gha-every-pr

```text
Add Doc Detective to our GitHub Actions so docs get tested on every PR.
```

### gha-nightly

```text
Set up a CI workflow that runs our doc tests nightly.
```

### gha-open-issue

```text
I want failing doc tests to open an issue automatically in GitHub.
```

### concept-spec-vs-inline

```text
What's the difference between a test spec and inline tests in Doc Detective?
```

### concept-file-scanning

```text
How does Doc Detective decide which markdown files to scan for tests?
```

### concept-why

```text
Explain the Docs as Tests approach and why it matters.
```

### neg-unit-tests

```text
Write unit tests for a date parser in src/utils.js.
```

### neg-typo

```text
Fix the typo in step 3 of docs/getting-started.md.
```

### neg-playwright

```text
Set up Playwright end-to-end tests for our sign-in page.
```

### neg-ci-npm-test

```text
Add a GitHub Actions workflow that runs npm test on every PR.
```

### neg-proofread

```text
Proofread docs/api.md for style issues.
```

### neg-openapi

```text
Validate this JSON against our OpenAPI schema: {"id": 1, "name": "Widget"}
```

### neg-reference-docs

```text
Generate API reference docs from the code comments.
```

### neg-write-tutorial

```text
Write a tutorial for creating widgets, with numbered steps.
```

### neg-vitepress

```text
Set up a VitePress docs site in this repo.
```
