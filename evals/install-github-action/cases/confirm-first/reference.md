Here's the workflow I'd add at `.github/workflows/doc-detective.yml`:

```yaml
name: Doc Detective

on:
  pull_request:

permissions:
  contents: read

jobs:
  doc-detective:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: doc-detective/github-action@v2
        with:
          config: .doc-detective.json
```

It runs Doc Detective on every pull request with `.doc-detective.json`. The token can only read the repository (`contents: read`), and a failing test fails the check.

Should I write it?
