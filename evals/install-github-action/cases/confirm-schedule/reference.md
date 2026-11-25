Here's the workflow I'd add at `.github/workflows/doc-detective.yml`:

```yaml
name: Doc Detective

on:
  schedule:
    - cron: '0 6 * * 1'
  workflow_dispatch:

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

It runs Doc Detective with `.doc-detective.json` every Monday at 6:00 UTC (`cron: '0 6 * * 1'`), and you can start it by hand from the **Actions** tab (`workflow_dispatch`). The token can only read the repository (`contents: read`).

Does Monday at 6:00 UTC suit you? Tell me another day or time if not. I'll write the file once you confirm.
