---
description: Treat documentation as testable. When editing docs or Doc Detective test specs, validate and test the documented procedures with Doc Detective instead of assuming they work.
globs: "**/*.md,**/*.mdx,**/*.spec.json,**/*.spec.yaml,**/*.spec.yml,**/*.doc-detective.json"
alwaysApply: false
---

# Doc Detective: Docs as Tests

Documentation contains testable assertions — promises to users about what happens
when they follow instructions. When you change documentation or a Doc Detective
test specification, verify the change rather than assuming it works.

## When this applies

- Editing user-facing documentation that describes a procedure (steps to click,
  type, navigate, run a command, or call an API).
- Creating or editing a Doc Detective test spec (`*.spec.json`, `*.spec.yaml`, or a
  file containing a `tests`/`steps` array of Doc Detective actions).

## What to do

- Prefer the project's Doc Detective skills/commands: `/doc-detective-generate`,
  `/doc-detective-test`, `/doc-detective-validate`, `/doc-detective-inject`,
  `/doc-detective-init`, `/doc-detective-install-github-action`.
- After changing a documented procedure, generate or update its test spec and run it;
  fix drift between the docs and the actual application behavior.
- Validate any test spec you write against the Doc Detective schema before committing.

## Critical format rule

In a Doc Detective action, the action name **is** the JSON key. Never wrap it in a
generic property whose value names the verb.

- Correct: `{ "click": "Save" }`, `{ "find": "Welcome" }`, `{ "goTo": "https://..." }`
- Wrong: an object keyed on a generic `action` field whose string value is the verb
  (for example `action` set to `click` with a separate `selector` field).

Prefer human-visible text over CSS selectors (`{ "click": "Save" }` over
`{ "click": { "selector": "#save-btn" } }`) so tests mirror what a real user does.
