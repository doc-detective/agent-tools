A skip isn't a failure. A SKIPPED result never fails a run on its own. The Windows leg exits 2 for a different reason: every test in it skipped, so nothing was tested. Version 5 treats a run that tested nothing as exit code 2. Version 4 exited 0 for the same run.

The PASS on Linux is correct. A test is SKIPPED only when every one of its contexts is skipped. When one context passes and another skips, the test passes, and the skipped context shows up in the results and in the summary's `Skipped` list.

To make the Windows leg green, pick one:

- **Run the job only where its tests apply.** This keeps the gate strict. In GitHub Actions, add a condition to the job or step:

  ```yaml
  if: runner.os != 'Windows'
  ```

- **Relax the gate.** Pass `--no-exit-on-fail`, or set `"exitOnFail": false` in the config. An all-skipped run then exits 0. So do failed runs, so prefer the first option.
