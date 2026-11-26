Doc Detective 5 rejects invalid specs before it runs anything. One invalid spec, such as a step with the unknown key `asertions`, stops the whole run, and it exits `2`. Version 4 warned, skipped that spec, and ran the rest.

Yes, `--no-exit-on-fail` gets tonight's run going:

```bash
npx doc-detective --input docs --no-exit-on-fail
```

It skips each invalid spec with a warning and runs the valid ones. `exitOnFail: false` in the config does the same. It also turns failed, empty, and all-skipped runs into exit code `0`. While it's set, a failing test no longer fails the job, so treat it as a one-night workaround.

To find every invalid spec at once, check them without running anything:

```bash
npx doc-detective validate docs
```

`validate` checks every spec file and inline test, prints each invalid file with its problems, and exits `1` if any test is invalid. Add `--json` for one document with a `files` list.

For `checkout.spec.json`, rename the step's `asertions` key to `assertions`. Then run `validate` again, and drop `--no-exit-on-fail` once it exits `0`.
