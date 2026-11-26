There's no such option. In version 5, a key Doc Detective doesn't recognize on a spec or a step makes the whole spec invalid, and the run exits `2` before any test runs. Version 4 ignored those keys, which also meant a typo like `asertions` silently turned a check off.

Move the metadata out of the step. A step's `description` takes any text, so it can carry the tag:

```json
{
  "stepId": "check-node",
  "description": "owner: docs-team",
  "runShell": {
    "command": "node --version"
  }
}
```

Your dashboard can read `description` and `stepId` from the results. You can also keep a separate file that maps each `stepId` to its owner.

To find every spec that needs the change without running anything, run `npx doc-detective validate docs`. It names the file and the key for each problem, and it exits `1` if any test is invalid.

`--no-exit-on-fail`, or `"exitOnFail": false`, doesn't accept the extra keys either. It skips each invalid spec with a warning and runs the valid ones, so the tagged steps still don't run.
