With a `background` object, `runShell` returns as soon as the process is ready instead of waiting for it to exit. Because the process doesn't exit during the step, Doc Detective doesn't apply `stdio`, `exitCodes`, or the output-saving checks to it. Your `stdio` is ignored, and without a wait condition the process counts as ready the moment it starts.

Put the readiness check in `background.waitUntil`. It takes `stdio` (a string or `/regex/`), `port`, `httpGet`, and `delayMs`, and every condition you set must pass. In background mode, the step's `timeout` is how long to wait for readiness. If the process exits or isn't ready in time, the step fails and Doc Detective stops the process.

Stop the process with a `closeSurface` step that names it:

```json
{
  "tests": [
    {
      "steps": [
        {
          "runShell": {
            "command": "node -e \"require('http').createServer((q,s)=>s.end('ok')).listen(4123,()=>console.log('Listening on 4123'))\"",
            "background": {
              "name": "api",
              "waitUntil": { "stdio": "Listening on 4123", "port": 4123 }
            },
            "timeout": 10000
          }
        },
        { "httpRequest": "http://localhost:4123/" },
        { "closeSurface": "api" }
      ]
    }
  ]
}
```

If you leave out `closeSurface`, Doc Detective stops the process when the run finishes.
