# Check the service status

Use the status endpoint to check that the API is up before you file a support ticket.

1. Send `GET http://localhost:8093/status/200`.
2. Check that the response code is `200`.
3. Check that the body is `{"status": 200}`.
