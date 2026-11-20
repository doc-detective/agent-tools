# Round 1 change proposal

Widen validate, generate, and the specialist agent to cover question-shaped and pasted-content requests, and tell the model to route them even when it could answer from memory.

## Behavior

The model answers Doc Detective requests itself when they arrive as a question or carry their input inline, such as a pasted spec or config, pasted doc text, a "what would it look like" ask, a general failure-cause question, or a tool comparison. The current descriptions are file-shaped ("an existing ... spec or config file", "the procedures in a documentation file"). The agent description also pushes Playwright comparisons away ("Not for Playwright or other test frameworks"). Nothing tells the model that it should still route when the answer looks easy.

- Train baseline: `correct` 142/159. All 17 lost case-reps come from this one behavior.
- 15 case-reps answered directly (routed `none`): real-valid-or-invalid 3, real-map-instructions 3, hard-agent-why-fail 3, hard-pw-which-tool 3, hard-gen-what-would-test 2 (read the file, then answered inline), val-will-it-accept 1.
- 2 case-reps went to the wrong route: val-will-it-accept went to the agent twice, because "will Doc Detective accept this pasted config" reads as a knowledge question and validate's description only names files.
- Cost: 17 `correct` (about 10.7 points on train).

## Evidence (verbatim, assistant turn shown after the user turn)

- `.claude/hillclimb/routing/baseline/traces/real-valid-or-invalid_rep0.json` (same in rep1 and rep2). User: `Can I inject this test spec into documentation? {"notTests":[{"steps":[{"goTo":"http://localhost:8092"}]}]} Just say VALID or INVALID.` Assistant: `INVALID`
- `.claude/hillclimb/routing/baseline/traces/val-will-it-accept_rep2.json`. Assistant: "No, I don't expect Doc Detective to accept it. ... I haven't run it, so that's from what I know of the schema." ... "If you save the config to a file such as `.doc-detective.json`, I can run the validate skill on it to confirm." The model reads validate as file-only.
- `.claude/hillclimb/routing/baseline/traces/val-will-it-accept_rep0.json` (and rep1). It calls `"subagent_type": "doc-detective:doc-detective-specialist"` with `"description": "Check Doc Detective config validity"`.
- `.claude/hillclimb/routing/baseline/traces/real-map-instructions_rep0.json` (all 3 reps). Assistant: "Each instruction maps to one action in a Doc Detective test step:" ... "A full test spec would look like this:". The model writes the spec inline without calling generate.
- `.claude/hillclimb/routing/baseline/traces/hard-gen-what-would-test_rep1.json` (and rep2). After a single Read of docs/api.md, the assistant says: "Here's a spec for `docs/api.md`. I haven't saved it anywhere, changed the doc, or run it." For contrast, rep0 called `"skill": "doc-detective:doc-detective-generate"`.
- `.claude/hillclimb/routing/baseline/traces/hard-agent-why-fail_rep0.json` (all 3 reps). Assistant: "A `goTo` step passes once the browser has navigated and the page's load event fires. A `find` step then has to locate an element, and that can fail for reasons `goTo` never checks." It gives a general troubleshooting answer from memory.
- `.claude/hillclimb/routing/baseline/traces/hard-pw-which-tool_rep0.json` (all 3 reps). Assistant: "**Use Doc Detective for testing the procedures in your docs. Keep Playwright for testing your app.**"
- Contrast: `.claude/hillclimb/routing/baseline/traces/hard-agent-variables_rep0.json` routes to the agent (`"subagent_type": "doc-detective:doc-detective-specialist"`), and `.claude/hillclimb/routing/baseline/traces/val-spec-file_rep0.json` routes `"skill": "doc-detective:doc-detective-validate"`. Both name a syntax topic or a file, so the current wording catches them.

## The change

Three descriptions change. init, test, inject, and install-github-action stay as they are.

1. **validate**: covers pasted JSON as well as files, and yes-or-no "would this load or be rejected" questions. It says "Use it rather than judging validity from memory" and adds a "Not for generic JSON or YAML syntax checks" guard.
2. **generate**: the source can be pasted doc text. It covers requests to see or sketch the test for specific docs and questions about which actions specific doc steps translate to, "even if the answer could be written out directly".
3. **specialist agent**: it applies "including ones you could answer from general knowledge". It adds failure patterns and likely causes, plus comparisons with Playwright or other tools for testing docs. The handoff list now points specific doc text to generate and specific spec or config validity, pasted or on disk, to validate. The "not for" line is narrowed from all of Playwright to writing or running Playwright, Cypress, or other app tests, general testing questions not about Doc Detective, authoring content about Docs as Tests, and developing Doc Detective.

## Expected flips

- real-valid-or-invalid (3), val-will-it-accept (3): none or agent to validate.
- real-map-instructions (3), hard-gen-what-would-test (2): none to generate.
- hard-agent-why-fail (3), hard-pw-which-tool (3): none to agent.
- Ceiling +17 on train. A realistic +9 to +13.

## Regression risks (watch these)

- **neg-validate-json** (generic "is this valid JSON"): could fire validate. It is guarded by "Doc Detective" plus "Not for generic JSON or YAML syntax checks."
- **neg-dev-talk** (outline a Docs as Tests presentation): could fire the agent because of "Docs as Tests concepts" and "general knowledge". It is guarded by "authoring content about Docs as Tests".
- **hard-neg-screenshot-update, hard-neg-cypress**: Playwright or Cypress work that isn't doc testing. They are guarded by "Not for writing or running Playwright, Cypress, or other app tests". The Playwright scope is limited to comparisons and to testing documented procedures.
- **hard-neg-explain-testing** (unit vs e2e): guarded by "general testing questions not about Doc Detective".
- **hard-agent-find-vs-click, hard-agent-variables, concept-***: general syntax questions might drift to generate, which now mentions actions. Generate's new clause says "specific docs" and "specific doc steps", and the agent keeps general syntax.
- **hard-pw-can-dd-run** (currently agent, correct): this is a question, so it stays with the agent. Generate's wording doesn't mention Playwright.
- **hard-mix-validate-not-run, hard-val-*** (currently validate): the scope only widens, so low risk.

## Full new text

### src/skills/doc-detective-validate/SKILL.md

```yaml
description: 'Check whether a Doc Detective test spec or config is valid, whether it is a file such as .doc-detective.json or JSON pasted into the message, and name each invalid field, without running any tests. Use for yes-or-no questions about whether a specific spec or config would load or be rejected, and for lint or schema-check requests. Use it rather than judging validity from memory. To run tests, use doc-detective-test. To write a new spec, use doc-detective-generate. Not for generic JSON or YAML syntax checks.'
```

### src/skills/doc-detective-generate/SKILL.md

```yaml
description: 'Turn documented procedures into a Doc Detective test spec (JSON) without running it. The source can be a doc file or doc text pasted into the message. Use when the user wants a spec written, added to, or updated, or asks to see or sketch the test for specific docs, or which actions specific doc steps translate to, even if the answer could be written out directly. To run tests or check that docs still work, use doc-detective-test. To put tests inside the doc source as comments, use doc-detective-inject.'
```

### src/agents/doc-detective-specialist.md

```yaml
description: "Use this agent to answer questions about Doc Detective, including ones you could answer from general knowledge: how it works, Docs as Tests concepts, action and config syntax, inline test comment syntax, what an error, result, or failure pattern means and its likely causes, which option to choose, and how it compares with Playwright or other tools for testing docs, including requests to test documented procedures with Playwright. It answers from the plugin's Doc Detective references with working snippets. To carry out a task instead, use the matching skill: doc-detective-init (set up), doc-detective-generate (write a spec, or map specific doc text to steps), doc-detective-test (run or fix tests), doc-detective-validate (check whether a specific spec or config, pasted or on disk, is valid), doc-detective-inject, or doc-detective-install-github-action (CI). Not for writing or running Playwright, Cypress, or other app tests, general testing questions not about Doc Detective, authoring content about Docs as Tests, or developing Doc Detective itself."
```

## Unified diff (verified with `git apply --check` against the current tree)

```diff
--- a/src/skills/doc-detective-validate/SKILL.md
+++ b/src/skills/doc-detective-validate/SKILL.md
@@ -1,6 +1,6 @@
 ---
 name: doc-detective-validate
-description: 'Check whether an existing Doc Detective test spec or config file (such as .doc-detective.json) is valid, and name each invalid field, without running any tests. To run tests, use doc-detective-test. To write a new spec, use doc-detective-generate.'
+description: 'Check whether a Doc Detective test spec or config is valid, whether it is a file such as .doc-detective.json or JSON pasted into the message, and name each invalid field, without running any tests. Use for yes-or-no questions about whether a specific spec or config would load or be rejected, and for lint or schema-check requests. Use it rather than judging validity from memory. To run tests, use doc-detective-test. To write a new spec, use doc-detective-generate. Not for generic JSON or YAML syntax checks.'
 metadata:
   version: '2.1.1'
   organization: Doc Detective
--- a/src/skills/doc-detective-generate/SKILL.md
+++ b/src/skills/doc-detective-generate/SKILL.md
@@ -1,6 +1,6 @@
 ---
 name: doc-detective-generate
-description: 'Turn the procedures in a documentation file into a Doc Detective test spec (JSON) without running it. Use when the user wants a spec written or added to, not executed. To run tests or check that docs still work, use doc-detective-test. To put tests inside the doc source as comments, use doc-detective-inject.'
+description: 'Turn documented procedures into a Doc Detective test spec (JSON) without running it. The source can be a doc file or doc text pasted into the message. Use when the user wants a spec written, added to, or updated, or asks to see or sketch the test for specific docs, or which actions specific doc steps translate to, even if the answer could be written out directly. To run tests or check that docs still work, use doc-detective-test. To put tests inside the doc source as comments, use doc-detective-inject.'
 metadata:
   version: '2.1.1'
   organization: Doc Detective
--- a/src/agents/doc-detective-specialist.md
+++ b/src/agents/doc-detective-specialist.md
@@ -1,6 +1,6 @@
 ---
 name: doc-detective-specialist
-description: "Use this agent to answer questions about Doc Detective: how it works, Docs as Tests concepts, action and config syntax, inline test comment syntax, what an error or result means, and which option to choose. It answers from the plugin's Doc Detective references with working snippets. To carry out a task instead, use the matching skill: doc-detective-init (set up), doc-detective-generate (write a spec), doc-detective-test (run or fix tests), doc-detective-validate, doc-detective-inject, or doc-detective-install-github-action (CI). Not for Playwright or other test frameworks, or for developing Doc Detective itself."
+description: "Use this agent to answer questions about Doc Detective, including ones you could answer from general knowledge: how it works, Docs as Tests concepts, action and config syntax, inline test comment syntax, what an error, result, or failure pattern means and its likely causes, which option to choose, and how it compares with Playwright or other tools for testing docs, including requests to test documented procedures with Playwright. It answers from the plugin's Doc Detective references with working snippets. To carry out a task instead, use the matching skill: doc-detective-init (set up), doc-detective-generate (write a spec, or map specific doc text to steps), doc-detective-test (run or fix tests), doc-detective-validate (check whether a specific spec or config, pasted or on disk, is valid), doc-detective-inject, or doc-detective-install-github-action (CI). Not for writing or running Playwright, Cypress, or other app tests, general testing questions not about Doc Detective, authoring content about Docs as Tests, or developing Doc Detective itself."
 model: inherit
 metadata:
   organization: Doc Detective
```
