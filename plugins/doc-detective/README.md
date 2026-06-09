# doc-detective

Documentation testing and validation using Doc Detective. Test documentation procedures, convert docs to executable test specs, and validate that documented workflows match actual application behavior.

Learn more at [https://doc-detective.com](https://doc-detective.com).

## Commands

Invoke these directly (e.g. `/doc-detective-generate`):

- **`/doc-detective-generate`** — Interpret documentation procedures into Doc Detective test specifications without executing the tests. Parses docs, maps language to actions, validates the spec, and outputs the result.
- **`/doc-detective-init`** — Initialize Doc Detective in a repository with documentation detection, config generation, test creation, and iterative fix loop. Supports interactive and CI modes.
- **`/doc-detective-inject`** — Inject Doc Detective test specifications into documentation source files as inline comments, placing test steps close to their associated content using semantic pattern matching.
- **`/doc-detective-install-github-action`** — Install and configure the Doc Detective GitHub Action workflow for automated documentation testing in CI. Detects project context, creates workflow file, and configures action inputs including PR creation, issue creation, and integrations.
- **`/doc-detective-test`** — Convert documentation procedures into executable Doc Detective test specifications, run them, fix failures, and verify the documentation matches actual behavior.
- **`/doc-detective-validate`** — Validate Doc Detective test specifications or configuration files to ensure they are correctly structured.

## Supporting skills

Invoked automatically when relevant, not run directly:

- **doc-detective-doc-testing** — Test documentation procedures by converting them to Doc Detective test specifications and executing them. Validates that documented workflows match actual application behavior through automated browser testing.
- **doc-detective-inline-test-injection** — Inject Doc Detective test specifications directly into documentation files as inline comments. Supports Markdown, MDX, HTML, AsciiDoc, and XML/DITA formats with automatic format detection and semantic step matching.
- **doc-detective-project-bootstrap** — Initialize Doc Detective in a repository by detecting documentation, generating minimal configuration, creating tests for identified procedures, and iteratively running and fixing tests with confidence-based suggestions. Supports interactive and CI modes.

## Agents

- **doc-detective-specialist** — Use this agent when the user needs help with Doc Detective configuration, doc testing strategies, Docs as Tests methodology, or any aspect of using Doc Detective tools, commands, and plugins. This includes setting up test configurations, writing doc tests, debugging test failures, understanding Docs as Tests concepts, or integrating Doc Detective into workflows.

## MCP server

Bundles the Doc Detective MCP server, giving the agent direct access to Doc Detective's documentation-testing engine.

## License

Licensed under AGPL-3.0-only. See [LICENSE](./LICENSE).
