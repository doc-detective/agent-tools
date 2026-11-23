# Routing eval cases (141)

Each case is one request sent to Claude Code with only this plugin loaded. `expected` is the one correct route (the headline score). Routes in `also accepted` count only toward the secondary lenient score. `none` means no skill and no Doc Detective agent should be invoked. Cases with source `real` keep the user's original wording, typos included, so don't correct them. Cases tagged `hard-set` target the ways routing went wrong in the first baseline. They include task requests phrased as questions, validity checks, and "why" questions. Others use indirect phrasing or two intents, or look like Doc Detective work but aren't. Cases tagged `hard-set-2` add requests in other languages, terse or misspelled requests, and run-versus-validate ambiguity. They also add questions about flags and results, and negatives that press on the wider descriptions.

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
| hard-val-will-this-pass | doc-detective-validate | - | configured-project | hard-set | hard |
| hard-val-yaml-question | doc-detective-validate | - | empty | hard-set | hard |
| hard-val-which-field | doc-detective-validate | - | configured-project | hard-set | hard |
| hard-val-schema-version | doc-detective-validate | - | empty | hard-set | hard |
| hard-val-pr-gate | doc-detective-validate | - | configured-project | hard-set | hard |
| hard-val-lint-specs | doc-detective-validate | - | configured-project | hard-set | hard |
| hard-agent-exit-code | agent:doc-detective-specialist | - | empty | hard-set | hard |
| hard-agent-find-vs-click | agent:doc-detective-specialist | - | empty | hard-set | hard |
| hard-agent-why-fail | agent:doc-detective-specialist | - | empty | hard-set | hard |
| hard-agent-context-option | agent:doc-detective-specialist | - | empty | hard-set | hard |
| hard-agent-detect-steps | agent:doc-detective-specialist | - | empty | hard-set | hard |
| hard-agent-compare-tools | agent:doc-detective-specialist | - | empty | hard-set | hard |
| hard-agent-variables | agent:doc-detective-specialist | - | empty | hard-set | hard |
| hard-gen-what-would-test | doc-detective-generate | - | docs-project | hard-set | hard |
| hard-gen-cover-procedure | doc-detective-generate | - | docs-project | hard-set | hard |
| hard-gen-from-pasted | doc-detective-generate | - | empty | hard-set | hard |
| hard-gen-update-spec | doc-detective-generate | - | configured-project | hard-set | hard |
| hard-test-broken-docs | doc-detective-test | - | configured-project | hard-set | hard |
| hard-test-after-ui-change | doc-detective-test | - | configured-project | hard-set | hard |
| hard-test-flaky | doc-detective-test | - | configured-project | hard-set | hard |
| hard-test-smoke | doc-detective-test | - | configured-project | hard-set | hard |
| hard-inj-keep-together | doc-detective-inject | - | configured-project | hard-set | hard |
| hard-inj-mdx | doc-detective-inject | - | docs-project | hard-set | hard |
| hard-inj-annotate | doc-detective-inject | - | docs-project | hard-set | hard |
| hard-init-new-repo | doc-detective-init | - | docs-project | hard-set | hard |
| hard-init-where-start | doc-detective-init | - | docs-project | hard-set | hard |
| hard-init-config-first | doc-detective-init | - | docs-project | hard-set | hard |
| hard-gha-block-merge | doc-detective-install-github-action | - | configured-project | hard-set | hard |
| hard-gha-schedule | doc-detective-install-github-action | - | configured-project | hard-set | hard |
| hard-gha-pr-results | doc-detective-install-github-action | - | configured-project | hard-set | hard |
| hard-mix-gen-then-ci | doc-detective-install-github-action | - | configured-project | hard-set | hard |
| hard-mix-explain-then-run | doc-detective-test | - | configured-project | hard-set | hard |
| hard-mix-validate-not-run | doc-detective-validate | - | configured-project | hard-set | hard |
| hard-mix-gen-not-inline | doc-detective-generate | - | docs-project | hard-set | hard |
| hard-pw-write-for-doc | agent:doc-detective-specialist | - | docs-project | hard-set | hard |
| hard-pw-which-tool | agent:doc-detective-specialist | - | empty | hard-set | hard |
| hard-pw-can-dd-run | agent:doc-detective-specialist | - | empty | hard-set | hard |
| hard-pw-release-check | agent:doc-detective-specialist | - | docs-project | hard-set | hard |
| hard-pw-convert | doc-detective-generate | - | docs-project | hard-set | hard |
| hard-pw-app-only | none | - | docs-project | hard-set | hard |
| hard-neg-python-doctest | none | - | empty | hard-set | hard |
| hard-neg-cypress | none | - | docs-project | hard-set | hard |
| hard-neg-broken-links | none | - | docs-project | hard-set | hard |
| hard-neg-frontmatter | none | - | docs-project | hard-set | hard |
| hard-neg-api-contract | none | - | docs-project | hard-set | hard |
| hard-neg-screenshot-update | none | - | docs-project | hard-set | hard |
| hard-neg-ci-docs-build | none | - | docs-project | hard-set | hard |
| hard-neg-dd-dev-test | none | - | empty | hard-set | hard |
| hard-neg-explain-testing | none | - | empty | hard-set | hard |
| hard-neg-validate-json | none | - | empty | hard-set | hard |
| h2-init-es | doc-detective-init | - | docs-project | hard-set-2 | hard |
| h2-test-de | doc-detective-test | - | configured-project | hard-set-2 | hard |
| h2-val-fr | doc-detective-validate | - | configured-project | hard-set-2 | hard |
| h2-agent-pt | agent:doc-detective-specialist | - | empty | hard-set-2 | hard |
| h2-val-terse | doc-detective-validate | - | configured-project | hard-set-2 | hard |
| h2-test-typo | doc-detective-test | - | configured-project | hard-set-2 | hard |
| h2-gen-terse | doc-detective-generate | - | docs-project | hard-set-2 | hard |
| h2-gha-terse | doc-detective-install-github-action | - | configured-project | hard-set-2 | hard |
| h2-inj-terse | doc-detective-inject | - | configured-project | hard-set-2 | hard |
| h2-test-check-docs | doc-detective-test | - | configured-project | hard-set-2 | hard |
| h2-val-check-spec | doc-detective-validate | - | configured-project | hard-set-2 | hard |
| h2-test-verify-spec | doc-detective-test | - | configured-project | hard-set-2 | hard |
| h2-val-config-keys | doc-detective-validate | - | configured-project | hard-set-2 | hard |
| h2-agent-dry-run | agent:doc-detective-specialist | - | empty | hard-set-2 | hard |
| h2-agent-results-file | agent:doc-detective-specialist | - | empty | hard-set-2 | hard |
| h2-agent-input-glob | agent:doc-detective-specialist | - | empty | hard-set-2 | hard |
| h2-agent-screenshot-compare | agent:doc-detective-specialist | - | empty | hard-set-2 | hard |
| h2-agent-best-practice | agent:doc-detective-specialist | - | empty | hard-set-2 | hard |
| h2-agent-cypress-docs | agent:doc-detective-specialist | - | empty | hard-set-2 | hard |
| h2-gen-yaml | doc-detective-generate | - | docs-project | hard-set-2 | hard |
| h2-gen-api-only | doc-detective-generate | - | docs-project | hard-set-2 | hard |
| h2-gen-extend | doc-detective-generate | - | configured-project | hard-set-2 | hard |
| h2-test-one-file | doc-detective-test | - | configured-project | hard-set-2 | hard |
| h2-inj-from-scratch | doc-detective-inject | - | docs-project | hard-set-2 | hard |
| h2-inj-asciidoc | doc-detective-inject | - | docs-project | hard-set-2 | hard |
| h2-init-monorepo | doc-detective-init | - | docs-project | hard-set-2 | hard |
| h2-init-no-config | doc-detective-init | - | docs-project | hard-set-2 | hard |
| h2-gha-nightly-issue | doc-detective-install-github-action | - | configured-project | hard-set-2 | hard |
| h2-gha-existing-workflow | doc-detective-install-github-action | - | configured-project | hard-set-2 | hard |
| h2-neg-json-schema | none | - | empty | hard-set-2 | hard |
| h2-neg-yaml-syntax | none | - | empty | hard-set-2 | hard |
| h2-neg-playwright-vs-cypress | none | - | empty | hard-set-2 | hard |
| h2-neg-explain-flaky | none | - | empty | hard-set-2 | hard |
| h2-neg-write-howto | none | - | docs-project | hard-set-2 | hard |
| h2-neg-docs-as-code | none | - | empty | hard-set-2 | hard |
| h2-neg-openapi-examples | none | - | docs-project | hard-set-2 | hard |
| h2-neg-dd-release-notes | none | - | empty | hard-set-2 | hard |
| h2-neg-gha-lint | none | - | configured-project | hard-set-2 | hard |
| h2-neg-spec-word | none | - | empty | hard-set-2 | hard |

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

### hard-val-will-this-pass

```text
Quick sanity check before I push: would Doc Detective even load tests/login.spec.json, or is something in it malformed?
```

### hard-val-yaml-question

```text
Is this OK as a Doc Detective spec?

tests:
  - steps:
      - goTo: https://example.com
      - find:
          text: Example Domain
```

### hard-val-which-field

```text
Something in my .doc-detective.json is wrong but I can't tell what. Which field is the problem?
```

### hard-val-schema-version

```text
Does this config still conform to the current schema? {"input": "docs", "output": "results", "runTests": {"setup": "setup.json"}}
```

### hard-val-pr-gate

```text
Before I open the PR, make sure none of the spec files I touched have errors. Don't run anything.
```

### hard-val-lint-specs

```text
Lint my Doc Detective specs.
```

### hard-agent-exit-code

```text
What does it mean when Doc Detective exits with code 2?
```

### hard-agent-find-vs-click

```text
When should I use a find step with click: true instead of a separate click step?
```

### hard-agent-why-fail

```text
Why would a goTo step pass but the next find step time out, in general? Not asking about a specific test.
```

### hard-agent-context-option

```text
How do contexts and runOn work in Doc Detective? I want to understand them before I touch my config.
```

### hard-agent-detect-steps

```text
What's detectSteps actually doing to my markdown?
```

### hard-agent-compare-tools

```text
How is Doc Detective different from Cypress for checking that our docs are right?
```

### hard-agent-variables

```text
Can a Doc Detective step read an environment variable? What is the syntax?
```

### hard-gen-what-would-test

```text
What would a Doc Detective test for docs/api.md look like? Write it out, but leave it out of the doc and don't run it.
```

### hard-gen-cover-procedure

```text
I need test coverage for the steps in the widget section of the getting started guide. Just the spec file for now.
```

### hard-gen-from-pasted

```text
Make a Doc Detective spec out of this procedure:

1. Open https://example.com/login
2. Enter your username and password
3. Click Sign in
4. You should see Welcome back
```

### hard-gen-update-spec

```text
The sign-in page now asks for a one-time code after the email. Write a new version of the login spec that matches the docs, without running it.
```

### hard-test-broken-docs

```text
Users say the getting started guide is broken. Find out which step fails.
```

### hard-test-after-ui-change

```text
We shipped a UI redesign yesterday. Are our documented procedures still accurate?
```

### hard-test-flaky

```text
tests/login.spec.json failed in CI last night. Rerun it locally and fix it if it's our spec, not the app.
```

### hard-test-smoke

```text
Smoke-test the docs.
```

### hard-inj-keep-together

```text
I want the login test to live right next to the steps it checks, in the markdown, so writers see it when they edit.
```

### hard-inj-mdx

```text
Our docs are moving to MDX. Put Doc Detective steps into docs/getting-started.md as comments that will survive the move.
```

### hard-inj-annotate

```text
Annotate docs/api.md with test steps.
```

### hard-init-new-repo

```text
This docs repo has never been tested. Get it to the point where I can run one command and see which procedures work.
```

### hard-init-where-start

```text
We want docs as tests here. Do whatever setup it takes; I don't know where to start.
```

### hard-init-config-first

```text
Add Doc Detective to this project, starting with whatever config file it needs.
```

### hard-gha-block-merge

```text
Block merges when a documented procedure breaks.
```

### hard-gha-schedule

```text
Have GitHub check our docs against production every morning and tell us if something drifted.
```

### hard-gha-pr-results

```text
I want doc test results to show up on every pull request.
```

### hard-mix-gen-then-ci

```text
The specs are already in tests/. Now wire them into GitHub Actions so they run on every PR.
```

### hard-mix-explain-then-run

```text
I don't really get how Doc Detective works, but just run the tests in this repo and tell me what failed.
```

### hard-mix-validate-not-run

```text
Run a check on tests/login.spec.json, but only a schema check: the app isn't up, so don't execute it.
```

### hard-mix-gen-not-inline

```text
Turn docs/getting-started.md into tests, as a separate JSON file. We do not want comments in the docs.
```

### hard-pw-write-for-doc

```text
Write Playwright tests that check every step in docs/getting-started.md still works.
```

### hard-pw-which-tool

```text
Should I use Playwright or Doc Detective to test the procedures in our docs?
```

### hard-pw-can-dd-run

```text
Can Doc Detective run our existing Playwright scripts, or do they need rewriting?
```

### hard-pw-release-check

```text
Set up Playwright to verify the procedures in our docs on every release.
```

### hard-pw-convert

```text
We have Playwright tests in tests/docs/ that walk through our guides. Convert them into Doc Detective specs.
```

### hard-pw-app-only

```text
Add a Playwright test for the signup form's validation errors.
```

### hard-neg-python-doctest

```text
Write doc tests for this Python function so the examples in its docstring get checked:

def add(a, b):
    """Add two numbers."""
    return a + b
```

### hard-neg-cypress

```text
Write a Cypress test that signs in and checks the dashboard loads.
```

### hard-neg-broken-links

```text
Run markdown-link-check over docs/ and fix the dead links it finds.
```

### hard-neg-frontmatter

```text
Validate the YAML front matter in every page under docs/ against our schema.
```

### hard-neg-api-contract

```text
Generate a Postman collection from the endpoints described in docs/api.md.
```

### hard-neg-screenshot-update

```text
Retake the screenshots in the getting started guide with Playwright and save them to docs/images.
```

### hard-neg-ci-docs-build

```text
Add a GitHub Actions workflow that builds the docs site and fails on broken internal links.
```

### hard-neg-dd-dev-test

```text
The doc-detective repo has a failing unit test in src/core/utils.test.ts. Figure out why.
```

### hard-neg-explain-testing

```text
What is the difference between unit tests and end-to-end tests?
```

### hard-neg-validate-json

```text
Is this valid JSON? {"name": "widget", "tags": ["a", "b",]}
```

### h2-init-es

```text
Configura Doc Detective en este repositorio para que podamos probar la documentación.
```

### h2-test-de

```text
Führ bitte die Doc-Detective-Tests in diesem Repo aus und sag mir, was fehlschlägt.
```

### h2-val-fr

```text
Est-ce que le fichier tests/login.spec.json est une spécification Doc Detective valide ?
```

### h2-agent-pt

```text
Qual é a diferença entre um teste inline e um arquivo de spec no Doc Detective?
```

### h2-val-terse

```text
dd validate tests/login.spec.json
```

### h2-test-typo

```text
run the doc detctive tests pls
```

### h2-gen-terse

```text
spec for docs/api.md, no run
```

### h2-gha-terse

```text
doc tests in CI
```

### h2-inj-terse

```text
inline the login spec into getting-started.md
```

### h2-test-check-docs

```text
Check that the docs still work.
```

### h2-val-check-spec

```text
Check the spec file for mistakes before anyone runs it.
```

### h2-test-verify-spec

```text
Verify tests/login.spec.json against the running app.
```

### h2-val-config-keys

```text
Are all the keys in .doc-detective.json ones Doc Detective actually recognizes?
```

### h2-agent-dry-run

```text
What does the --dry-run flag do in Doc Detective?
```

### h2-agent-results-file

```text
How do I read the results file Doc Detective writes? What do WARNING and SKIPPED mean there?
```

### h2-agent-input-glob

```text
Can the input setting in a Doc Detective config take a glob pattern?
```

### h2-agent-screenshot-compare

```text
How does Doc Detective decide whether a new screenshot differs enough from the old one to fail?
```

### h2-agent-best-practice

```text
Is it better to keep Doc Detective tests inline in the docs or in separate spec files for a big docs site?
```

### h2-agent-cypress-docs

```text
Our team wants Cypress to check that our tutorials' steps still work. Would Doc Detective be a better fit?
```

### h2-gen-yaml

```text
Write the Doc Detective tests for docs/getting-started.md as YAML instead of JSON, and save them; I will run them later.
```

### h2-gen-api-only

```text
Only the API calls in docs/api.md need tests. Write a spec for those and nothing else, without running it.
```

### h2-gen-extend

```text
Add a test for the widget creation steps to tests/login.spec.json. Do not run it yet.
```

### h2-test-one-file

```text
Just test docs/getting-started.md, nothing else.
```

### h2-inj-from-scratch

```text
docs/api.md has no tests yet. Write some and put them in the file as inline comments.
```

### h2-inj-asciidoc

```text
We also publish an AsciiDoc version of the getting started guide. Put inline Doc Detective steps in the AsciiDoc source the same way.
```

### h2-init-monorepo

```text
Set up Doc Detective for the docs folder of this repo only, and leave the rest of the repo alone.
```

### h2-init-no-config

```text
There's no Doc Detective config here yet. Create one and get a first test passing.
```

### h2-gha-nightly-issue

```text
Run the doc tests every night in GitHub Actions and open an issue when one fails.
```

### h2-gha-existing-workflow

```text
We already have a CI workflow. Add a Doc Detective job to GitHub Actions alongside it.
```

### h2-neg-json-schema

```text
Does this match our widget JSON schema? {"id": 3, "name": "Gear", "price": "12"}
```

### h2-neg-yaml-syntax

```text
Why does this YAML fail to parse?

steps:
  - name: build
   run: npm test
```

### h2-neg-playwright-vs-cypress

```text
For end-to-end testing our web app, should we pick Playwright or Cypress?
```

### h2-neg-explain-flaky

```text
Why are my Jest tests flaky in CI but fine locally?
```

### h2-neg-write-howto

```text
Write a how-to page for resetting a widget, in the same style as docs/getting-started.md.
```

### h2-neg-docs-as-code

```text
Explain what docs-as-code means and how it differs from a wiki.
```

### h2-neg-openapi-examples

```text
Check that the request examples in docs/api.md match our OpenAPI spec.
```

### h2-neg-dd-release-notes

```text
Draft release notes for Doc Detective 5.6 from the doc-detective repo's merged PRs.
```

### h2-neg-gha-lint

```text
Add a GitHub Actions job that runs markdownlint on docs/.
```

### h2-neg-spec-word

```text
Write a product spec for a new widget sharing feature.
```
