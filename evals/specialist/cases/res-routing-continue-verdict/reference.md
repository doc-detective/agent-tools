No. Routing handlers such as `onFail` control flow, not the verdict. `continue` lets the later steps run, but the step stays FAIL, so the test still rolls up to FAIL and the run exits 1.

To make exit code 1 a success, change the step's own check. `runShell` accepts only the exit codes in `exitCodes`, which defaults to `[0]`. List 1 there, and the step passes:

```json
{
  "runShell": {
    "command": "node scripts/cleanup.js",
    "exitCodes": [0, 1]
  }
}
```

You don't need the `onFail` handler anymore, because a passing step continues on its own. Custom `assertions` can't do this job: they can add a failure, but they can't rescue a step whose exit code check already failed.
