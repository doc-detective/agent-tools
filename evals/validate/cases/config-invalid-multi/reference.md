I ran `npx doc-detective@5 validate --config .doc-detective.json`. It stopped with `Invalid config`:

- `fileTypes[0]`: must be one of markdown, asciidoc, html, dita, rst (got "md").
- `concurrentRunners`: must be >= 1.
- `retries`: must be <= 10.

Validation FAILED
