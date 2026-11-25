# Register a webhook

A webhook tells Acme where to send an event, such as a new order.

1. Send a `POST` request to `http://localhost:8098/api/webhooks` with this JSON body:

   ```json
   { "url": "https://example.com/hooks/orders", "event": "order.created" }
   ```

2. Check that the service responds with `200 OK`.
3. Check that the response body echoes the `url` and `event` you sent.
