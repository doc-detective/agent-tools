# Send feedback through the web gateway

The demo app accepts API calls on two ports:

- The web gateway on port `8092` passes each call through a layer that tags the
  response with an extra field.
- The API on port `8093` answers directly and returns only what you sent.

Use this page to confirm that both routes work.

## Send feedback through the gateway

1. Send a `POST` request to `http://localhost:8092/api/feedback` with this JSON
   body:

   ```
   { "rating": 5, "comment": "Fast setup" }
   ```

   The response returns your `rating` and `comment`, plus a field named
   `extraField` with the value `added by server`.

## Send feedback straight to the API

2. Send the same `POST` request to `http://localhost:8093/api/feedback`.

   The response contains exactly the two fields you sent, `rating` and `comment`,
   and nothing else.
