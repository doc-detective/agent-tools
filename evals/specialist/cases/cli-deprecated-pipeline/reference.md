The command still runs, but the step no longer gates anything.

`runTests`, `-e`/`--exit-on-fail`, and `--logLevel` are deprecated in version 5. They still work, and each prints a warning on stderr:

- `runTests` becomes `run`, or no command at all.
- `--logLevel` becomes `--log-level`.
- Delete `-e`. Exiting `1` when a test fails is now the default, so the flag does nothing but warn.

The grep is the part that breaks. Logs, warnings, and errors go to stderr, not stdout, and they lose their level labels such as `(ERROR)`. `dd.log` holds stdout, so it never contains `(ERROR)`, and the check never fails the job.

Let the exit code gate the job instead:

```bash
npx doc-detective run --input docs --log-level warning
```

It exits `0` when no test failed and at least one passed or warned, `1` when a test failed, and `2` when nothing valid was tested, such as an invalid spec or no tests found. Most CI systems fail the step on any non-zero code. To keep the log, add `2> dd.log`. For machine-readable results, add `--output results.json`.
