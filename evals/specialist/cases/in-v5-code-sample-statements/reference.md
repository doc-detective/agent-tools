No, not for those samples. You can remove the wrappers.

Doc Detective 5 parses each file before it looks for tests, so it knows a code sample from a comment. It doesn't read statements inside code blocks, inline code, or other code. A `<!-- step ... -->` comment inside a ```` ```markdown ```` fence is part of the sample, so the sample test doesn't run.

The JSON blocks are fixed too. In version 4, the pattern for `js` blocks also matched `json`, so every JSON sample became an unsafe `runCode` step. In version 5, only blocks tagged `bash`, `python`, `py`, `javascript`, or `js` become `runCode` steps.

Keep ignore blocks for prose you don't want detected, such as a link or bold text outside code. To see what version 5 detects on a page before you remove anything, run it with `--dry-run`:

```bash
npx doc-detective --input docs/contributing.md --dry-run
```
