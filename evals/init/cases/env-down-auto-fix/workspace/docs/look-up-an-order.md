# Look up an order

1. Send `GET http://localhost:8093/api/orders?id=A-1042`.
2. Check that the API responds with `200 OK`.
3. Check that the response body holds the order ID you asked for: `{"id": "A-1042"}`.
