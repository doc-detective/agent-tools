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
