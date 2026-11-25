# Read the request metrics

The metrics exporter counts the requests the API serves.

1. Send `GET http://localhost:8098/metrics`.
2. Check that the response code is `200`.
3. Find the `requests_total` line in the body.
