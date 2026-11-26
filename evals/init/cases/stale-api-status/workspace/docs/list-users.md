# List users

Users come back one page at a time.

1. Send `GET http://localhost:8093/api/users?page=3`.
2. Check that the API responds with `200 OK`.
3. Check that the response body holds the page you asked for: `{"page": "3"}`.
