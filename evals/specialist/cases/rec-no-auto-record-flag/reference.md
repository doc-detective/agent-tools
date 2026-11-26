The flag isn't broken. `--no-auto-record` sets `autoRecord` at the config level only. A spec or a test can set its own `autoRecord`, and the more specific level wins: test over spec over config. So a spec with `"autoRecord": true`, or a test in it with `"autoRecord": true`, still records every context in that scope, whatever the flag says.

Find the spec or test that sets `"autoRecord": true` and delete the key, or set it to `false`. With the key gone, that spec falls back to the config level, where the flag turns recording off.

`autoRecord` covers only the automatic full-context video in `.doc-detective/runs/`. A `record` step in a test still records with the flag. To skip one, set it to `record: false`.
