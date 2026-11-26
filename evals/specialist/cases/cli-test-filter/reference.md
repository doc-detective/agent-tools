Two rules bite here.

- `--test` takes one comma-separated list, given once. Repeating the flag is a usage error, so `-t login -t signup` exits `2`.
- Each pattern is a case-insensitive regular expression that matches anywhere in the `testId`. So `login` also matches `user-login-sso` and `LoginPage`. Anchor a pattern with `^` and `$` to match one exact ID.

Run:

```bash
npx doc-detective -i docs --test '^login$,^signup$'
```

The single quotes keep the shell from touching `$`. One alternation works too: `--test '^(login|signup)$'`.

Doc Detective splits the value on commas before it compiles each part as a regex, so a pattern can't hold a literal comma. A quantifier such as `{1,3}` breaks into two patterns. `--spec` works the same way on `specId`. In config, the same filter is `"testFilter": ["^login$", "^signup$"]`.
