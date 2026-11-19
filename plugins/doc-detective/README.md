# doc-detective

Documentation testing and validation using Doc Detective. Test documentation procedures, convert docs to executable test specs, and validate that documented workflows match actual application behavior.

Learn more at [https://doc-detective.com](https://doc-detective.com).

## Commands

Invoke these slash commands directly:

- **`/doc-detective-generate`** — Interpret documentation procedures into Doc Detective test specifications without executing the tests. Parses docs, maps language to actions, validates the spec, and outputs the result.
- **`/doc-detective-init`** — Initialize Doc Detective in a repository with documentation detection, config generation, test creation, and iterative fix loop. Supports interactive and CI modes.
- **`/doc-detective-inject`** — Inject Doc Detective test specifications into documentation source files as inline comments, next to the content each step tests. Supports Markdown, MDX, HTML, AsciiDoc, reStructuredText, and XML/DITA.
- **`/doc-detective-install-github-action`** — Install and configure the Doc Detective GitHub Action workflow for automated documentation testing in CI. Detects project context, creates workflow file, and configures action inputs including PR creation, issue creation, and integrations.
- **`/doc-detective-test`** — Convert documentation procedures into executable Doc Detective test specifications, run them, fix failures, and verify the documentation matches actual behavior.
- **`/doc-detective-validate`** — Validate Doc Detective test specifications or configuration files to ensure they are correctly structured.

## Agents

- **doc-detective-specialist** — Use this agent to answer questions about Doc Detective, including ones you could answer from general knowledge: how it works, Docs as Tests concepts, action and config syntax, inline test comment syntax, what an error, result, or failure pattern means and its likely causes, which option to choose, and how it compares with Playwright or other tools for testing docs, including requests to test documented procedures with Playwright. It answers from the plugin's Doc Detective references with working snippets. To carry out a task instead, use the matching skill: doc-detective-init (set up), doc-detective-generate (write a spec, or map specific doc text to steps), doc-detective-test (run or fix tests), doc-detective-validate (check whether a specific spec or config, pasted or on disk, is valid), doc-detective-inject, or doc-detective-install-github-action (CI). Not for writing or running Playwright, Cypress, or other app tests, general testing questions not about Doc Detective, authoring content about Docs as Tests, or developing Doc Detective itself.

## MCP server

Bundles the `doc-detective` MCP server, giving the agent direct access to Doc Detective's documentation-testing engine.

## License

Licensed under AGPL-3.0-only. See [LICENSE](./LICENSE).
