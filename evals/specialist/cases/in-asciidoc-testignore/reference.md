Add `testIgnore` after the language, as its own option in the block's attribute line:

```asciidoc
[source,bash,testIgnore]
----
systemctl restart app
----
```

In AsciiDoc, the options after the language are the code block's meta, the same as the text after the language on a Markdown fence. The built-in `runCode` definition skips code blocks whose meta matches `testIgnore`. A role, such as `role=testIgnore` or `[source.testIgnore,bash]`, isn't meta, so the listing still runs.

To skip more than one listing, wrap them in an ignore block instead: `// (test ignore start)` above and `// (test ignore end)` below.

The other `[source,bash]` listings become `runCode` steps that are marked unsafe. They run only when you pass `--allow-unsafe` or set `allowUnsafeSteps: true` in your config. Without it, Doc Detective skips them and reports "Skipped: unsafe steps aren't allowed. Pass `--allow-unsafe` to run them."

```bash
npx doc-detective --input runbook.adoc --allow-unsafe
```
