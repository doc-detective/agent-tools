## [3.1.0](https://github.com/doc-detective/agent-tools/compare/v3.0.0...v3.1.0) (2026-11-24)

### Features

* **skills:** inline checks with a dry run and tests stated results ([#112](https://github.com/doc-detective/agent-tools/issues/112)) ([0b0d831](https://github.com/doc-detective/agent-tools/commit/0b0d8316bb7ba9899405778402ea29f08d26a4b0))
* **skills:** inline places requests after the text naming their URL ([#113](https://github.com/doc-detective/agent-tools/issues/113)) ([0fffed6](https://github.com/doc-detective/agent-tools/commit/0fffed6089a99fa8bf5daabfde04868ba0933514))

## [3.0.0](https://github.com/doc-detective/agent-tools/compare/v2.1.4...v3.0.0) (2026-11-23)

### ⚠ BREAKING CHANGES

* **skills:** removed the doc-detective-doc-testing,
doc-detective-inline-test-injection, and doc-detective-project-bootstrap
skills. Use doc-detective-test (or doc-detective-generate for a spec
only), doc-detective-inject, and doc-detective-init instead. Bundled
scripts moved to skills/doc-detective-test/scripts/ and
skills/doc-detective-inject/scripts/.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

* fix(skills): correct stale facts found by a prompt audit

A prompt audit of the deduped skills found facts the code has outgrown.
This applies its high-confidence fixes:

- Variables: `$EMAIL$` and `$API_KEY$` become `$EMAIL` and `$API_KEY`.
  Doc Detective substitutes `\$[A-Za-z0-9_]+`, so the trailing `$` was
  typed literally.
- Init: the config's `input` names the directory the specs go in, and
  init creates that directory before calling generate with `--output`.
- actions.md: httpRequest nests headers and body under `request` and
  `response`; screenshot uses `crop`; checkLink's default status codes,
  runShell's workingDirectory and invalid-spec behavior, and app
  workingDirectory match the v3 schemas.
- Test: error text uses the v5 "Couldn't find element" message;
  `--inject` runs inject with `--apply`; `--max-iterations` is gone;
  `DOC_DETECTIVE_DEBUG` only raises the log level.
- Inject: the TODO marker uses each format's own comment syntax, and the
  fileTypes examples extend `markdown`.
- Validate: the schema link points to `config_v3` in the monorepo.
- Agent: the click example has a field the schema accepts.
- CI skill: opening PRs needs the "Allow GitHub Actions to create and
  approve pull requests" setting; the `cache` input is documented; the
  WebDriverAgent prebuild template applies only before Doc Detective
  5.6.0 or with `cache: false`.
- README: Cursor is in the hook support list.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

* fix(skills): restore script execute bits and fix Vale findings

- The generated copies of the inject and test skill scripts lost their
  execute bit when they moved on Windows, so `npm run test:inline` failed
  with "Permission denied" and CI's built-output check saw a mode diff.
  They're 100755 again, matching src/.
- Rewrite the lines Vale flagged in this PR: em dashes in the agent's
  reference lists, long sentences in inject and the action reference,
  and colon-reveal bullets in test.
- Inject's placement rule says the earliest match within the search
  range, as the merged skill used to.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

* fix(skills): address CodeRabbit review on inject, CI, and test skills

- Inject: never narrow a glob to keep `*/` out of an MDX comment; move
  the step to a standalone spec instead. Check the script's preview for
  steps placed before the step they follow, and add the TODO comments
  the script doesn't write.
- CI reference: the action finds iOS tests only in JSON, Markdown, MDX,
  and YAML files, so other formats need the manual cache.
- CI skill: a custom token also goes to actions/checkout, because the
  action pushes with the checkout's credentials.
- Test: fix-tests.js reads and writes JSON specs only.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

* fix(skills): scope the PR-creation setting to the default token

The "Allow GitHub Actions to create and approve pull requests" setting
governs only the default GITHUB_TOKEN. A custom token is bound by its own
permissions, and also has to reach actions/checkout.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

* fix(skills): keep an MDX-unsafe test whole in a standalone spec

Moving only the step whose payload contains */ would split its test and
change its order or state. Keep the whole test out of the MDX file, and
note the exception in Done when.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

* style(skills): split a long Done-when sentence in inject

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

* fix(skills): write a corrected inject preview instead of rerunning --apply

--apply recomputes the script's placements, so a correction made to the
preview would be lost. Write the corrected result yourself after the user
confirms, and check that test end follows the test's last step.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

* fix(skills): drop the token claim from the branch-protection note

A PR the action opens with a custom token can need approval too. Also
restore the note that the iOS cache scan skips formats such as AsciiDoc,

### Bug Fixes

* **skills:** route question-shaped requests to validate, generate, and the agent ([#99](https://github.com/doc-detective/agent-tools/issues/99)) ([c5e140f](https://github.com/doc-detective/agent-tools/commit/c5e140f28ff5016085d2d6669e1e59d3970624e9))
* **skills:** use the Doc Detective CLI before the hosted MCP tools ([#101](https://github.com/doc-detective/agent-tools/issues/101)) ([68b369c](https://github.com/doc-detective/agent-tools/commit/68b369c378f9603c500f471fd30200b8ab0bfd36))

### Code Refactoring

* **skills:** give each Doc Detective request one owning skill ([#96](https://github.com/doc-detective/agent-tools/issues/96)) ([d75e114](https://github.com/doc-detective/agent-tools/commit/d75e1140fa3e9e52845c5c728eab5d951c64c601)), closes [#95](https://github.com/doc-detective/agent-tools/issues/95)

## [2.1.4](https://github.com/doc-detective/agent-tools/compare/v2.1.3...v2.1.4) (2026-11-20)

### Bug Fixes

* **skills:** note pull request cache scope in the action skill ([#103](https://github.com/doc-detective/agent-tools/issues/103)) ([702574a](https://github.com/doc-detective/agent-tools/commit/702574a859405b152a619af1ddc21cea38a6a9e8))

## [2.1.3](https://github.com/doc-detective/agent-tools/compare/v2.1.2...v2.1.3) (2026-11-20)


### Bug Fixes

* **skills:** tighten three cache claims in the action reference ([#102](https://github.com/doc-detective/agent-tools/issues/102)) ([b38a2fe](https://github.com/doc-detective/agent-tools/commit/b38a2fe1f7c336eeee5743f114e4f42bf3105379))

## [2.1.2](https://github.com/doc-detective/agent-tools/compare/v2.1.1...v2.1.2) (2026-11-20)


### Bug Fixes

* **skills:** describe the GitHub Action's built-in cache ([#95](https://github.com/doc-detective/agent-tools/issues/95)) ([637d56b](https://github.com/doc-detective/agent-tools/commit/637d56b1f8f0712bceaff4be68a4651f8531ad60))

## [2.1.1](https://github.com/doc-detective/agent-tools/compare/v2.1.0...v2.1.1) (2026-11-19)


### Bug Fixes

* **skills:** correct stale paths, examples, and config facts ([#91](https://github.com/doc-detective/agent-tools/issues/91)) ([5a555ba](https://github.com/doc-detective/agent-tools/commit/5a555baadf477e6a769806da8743b97e77591ab0))

# [2.1.0](https://github.com/doc-detective/agent-tools/compare/v2.0.2...v2.1.0) (2026-11-17)


### Features

* support reStructuredText (.rst) docs ([#87](https://github.com/doc-detective/agent-tools/issues/87)) ([91d957d](https://github.com/doc-detective/agent-tools/commit/91d957d3373ab152c4afb5cdeb8b73be4c44b5e6))

## [2.0.2](https://github.com/doc-detective/agent-tools/compare/v2.0.1...v2.0.2) (2026-11-14)


### Bug Fixes

* **hooks:** only report a global Doc Detective 5 or later as ready ([#80](https://github.com/doc-detective/agent-tools/issues/80)) ([39c477a](https://github.com/doc-detective/agent-tools/commit/39c477a5f300d5e84e0eb7ba741a3928fe2c8b79))

## [2.0.1](https://github.com/doc-detective/agent-tools/compare/v2.0.0...v2.0.1) (2026-11-13)


### Bug Fixes

* pin npx doc-detective to [@5](https://github.com/5) ([#79](https://github.com/doc-detective/agent-tools/issues/79)) ([ac2c8a9](https://github.com/doc-detective/agent-tools/commit/ac2c8a913eb2debe8ef05056e46fd7707d457b91))

# [2.0.0](https://github.com/doc-detective/agent-tools/compare/v1.4.1...v2.0.0) (2026-11-13)


* feat!: update agent tools for Doc Detective CLI 5 ([#77](https://github.com/doc-detective/agent-tools/issues/77)) ([c137679](https://github.com/doc-detective/agent-tools/commit/c137679f7f5615fed8a57ea57be50ef49515d520))


### BREAKING CHANGES

* the agent tools now target Doc Detective CLI 5 and
GitHub Action v2. They generate specs and commands that CLI 4 rejects or
misreads (exit codes, `--output-dir`, `elementText`, object
`goTo.waitUntil`, `doc-detective-tests/` location). CLI 4 users stay on
the `v1` tag.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

## [1.4.1](https://github.com/doc-detective/agent-tools/compare/v1.4.0...v1.4.1) (2026-07-16)


### Bug Fixes

* include .cursor-plugin/marketplace.json in pre-commit drift check ([#59](https://github.com/doc-detective/agent-tools/issues/59)) ([5e97c52](https://github.com/doc-detective/agent-tools/commit/5e97c52d3d93ef7e4dd19fad0986f3ef385bef29))
