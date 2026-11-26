`runShell` runs commands in `bash` by default on every platform, Windows included. On Windows it uses Git Bash. Bash doesn't expand `%OS%`, so it prints the text as written.

To run the command in a Windows shell, set `shell` to `cmd` on the step:

```json
{
  "tests": [
    {
      "steps": [
        {
          "runShell": {
            "command": "echo %OS%",
            "shell": "cmd",
            "stdio": "Windows_NT"
          }
        }
      ]
    }
  ]
}
```

`shell` also takes `powershell`. `cmd` and `powershell` work only on Windows. To change the default for every `runShell` step, set `shell` in the config instead. Or keep the default and write the command in bash syntax, as `echo $OS`, so the same step runs on every platform.
