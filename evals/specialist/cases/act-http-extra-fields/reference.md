`response.body` checks only the fields you declare. The response can carry other fields and the step still passes, because `allowAdditionalFields` defaults to `true`.

Set `allowAdditionalFields` to `false` to fail the step when the response has any field you didn't declare in `response.body`. It sits on the `httpRequest` object, beside `response`:

```json
{
  "tests": [
    {
      "steps": [
        {
          "httpRequest": {
            "url": "http://localhost:8093/api/widgets",
            "method": "post",
            "request": { "body": { "name": "bolt", "size": 3 } },
            "response": { "body": { "name": "bolt", "size": 3 } },
            "allowAdditionalFields": false
          }
        }
      ]
    }
  ]
}
```

The check descends into nested objects and names each extra field by its dot-path, such as `user.extra`. It applies only when `response.body` declares fields. With an unset or empty `response.body`, there's no key constraint.
