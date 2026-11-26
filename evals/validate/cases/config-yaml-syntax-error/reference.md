I ran `npx doc-detective@5 validate --config .doc-detective.yml`. It exits 2 with `Could not parse config file`: the file isn't valid YAML. Line 3, `logLevel: [warning`, opens a flow sequence that never closes.

Validation FAILED
