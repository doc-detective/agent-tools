Use the `validate` command, not `--dry-run`:

```bash
npx doc-detective validate docs
```

`validate` checks spec files and inline tests without running them. It finds files the same way a run does, from positional paths, `--input`, and `--config`, and it starts no browser. For each invalid file, it names the file and each problem.

Its exit codes differ from a run's:

| Code | Meaning |
|---|---|
| `0` | At least one test was found, and every test is valid |
| `1` | At least one spec or inline test is invalid |
| `2` | A usage error, invalid config, or no tests found |

Mind the packages without tests. There, `validate` finds nothing and exits `2`, so your hook would block the commit. Skip `validate` for those packages, or let the hook allow `2` and block only on `1`, though that also lets an invalid config through.

`--dry-run` resolves the full test plan, but it exits `2` for an invalid spec, the same code as a bad config or a usage error, so the hook can't tell them apart. For a script, `validate --json` prints one document with `valid` and a `files` array of `{ path, valid, errors }`.
