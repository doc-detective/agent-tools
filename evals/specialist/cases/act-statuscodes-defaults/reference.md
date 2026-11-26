It's not a bug. The two actions have different default `statusCodes`:

- `checkLink` accepts `[200, 301, 302, 307, 308]` by default. It's for links, so it accepts redirects but not `201`.
- `httpRequest` accepts `[200, 201]` by default. It's for API calls, so it accepts `201 Created` but not a redirect.

Each step uses its own action's default. To accept the same codes in both, set `statusCodes` on every step:

```json
{
  "tests": [
    {
      "steps": [
        { "checkLink": { "url": "http://localhost:8092/status/302", "statusCodes": [200, 201, 302] } },
        { "checkLink": { "url": "http://localhost:8092/status/201", "statusCodes": [200, 201, 302] } },
        { "httpRequest": { "url": "http://localhost:8092/status/302", "statusCodes": [200, 201, 302] } },
        { "httpRequest": { "url": "http://localhost:8092/status/201", "statusCodes": [200, 201, 302] } }
      ]
    }
  ]
}
```

`statusCodes` takes one integer or an array. A step that sets it replaces the default list, so include `200` if you still want it.
