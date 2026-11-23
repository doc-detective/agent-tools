# Round 10: take exit codes from running the spec's commands in order

Builds on round 7, with round 9's guidance and one rule added. Round 9 was reverted.

Diagnosed from round 9's failing train runs only. Of 19 failing train runs, 9 failed on an exit code the session set without seeing the command return it on the spec's setup:

- Exit `2` where the step expected `0`: a JSON pointer `get`, a `query --dry-run`, and a `cite` quote.
- Exit `1` where it expected `0` or `2`: fixture and retrofit config steps, and a bare `validate`.
- Exit `0` where it expected `2`: a refused range that an earlier step had already allowed.

Most also missed their `stdio`, because a command that stops on a usage error prints the usage message, not the result. The rest are the Doc Detective `runCode` output-path bug (3), an OpenAPI mock body (3), a web timeout, a drag-and-drop `find`, and two recording checks.

The change extends the `stdio` rule's scratch-folder run to `exitCodes`. The session runs the spec's commands in order, because one command can change what the next sees. When a command exits with a code the page doesn't show, the session fixes the setup or arguments until it does what the page shows. It then sets `exitCodes` to the code the command returns.
