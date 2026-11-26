An `if` condition doesn't substitute environment variables. `$RUN_SLOW` stays the literal text `$RUN_SLOW`, which never equals `'true'`, so the condition is false whether or not the variable is set. A bare `"if": "$RUN_SLOW"` is false too, and Doc Detective warns that it has nothing to evaluate.

A false `if` marks the step SKIPPED and doesn't run its action. That's not a failure. The test keeps going, so the steps after it still run.

Gate the step on a value Doc Detective can read in a condition. A step-level `if` can read an earlier step's outputs through `$$steps.<stepId>.outputs`. Check the variable in a `runShell` step, then test that step's exit code:

```json
{
  "tests": [
    {
      "steps": [
        {
          "stepId": "slow-flag",
          "runShell": { "command": "test \"$RUN_SLOW\" = true", "exitCodes": [0, 1] }
        },
        {
          "if": "$$steps.slow-flag.outputs.exitCode == 0",
          "runShell": "npm run test:slow"
        }
      ]
    }
  ]
}
```

`runShell` substitutes `$RUN_SLOW`, and listing both exit codes keeps the check step from failing when the variable isn't `true`.

To skip a whole test when the variable isn't set at all, gate its context with `requires` instead. `"runOn": [{ "requires": { "env": ["RUN_SLOW"] } }]` skips the context when `RUN_SLOW` is unset or empty, and reports the missing variable. It checks that the variable has a value, not what the value is.
