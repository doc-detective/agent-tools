# Trace a request through the API

When you report an API problem, support asks for a trace ID. Send your own trace
ID with the request, and the demo API returns it in the response so you can match
the two up in your logs.

## Send a request with a trace ID

1. Choose a trace ID. Any string works; this example uses `trace-123`.

2. Send a `GET` request to `http://localhost:8093/api/orders` with the trace ID in
   the `X-Test` request header:

   ```
   GET http://localhost:8093/api/orders
   X-Test: trace-123
   ```

## Check the response headers

3. Confirm that the response has HTTP status `200 OK` and includes these headers:

   | Header          | Value                       |
   | --------------- | --------------------------- |
   | `X-Echo-Test`   | `trace-123`                 |
   | `X-Server`      | `doc-detective-echo-server` |

   `X-Echo-Test` repeats your trace ID. `X-Server` identifies the server that
   handled the request.
