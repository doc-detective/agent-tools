# Simulate error responses

Your client should handle API errors gracefully. The demo API includes a status
endpoint that returns whatever HTTP status code you ask for, so you can test your
error handling without breaking anything.

## Request a status code

Send a `GET` request to `/status/{code}`, replacing `{code}` with a status code
between 100 and 599. The API returns that status and a JSON body that repeats it.

### Simulate a missing resource

```
GET http://localhost:8093/status/404
```

The API responds with HTTP status `404 Not Found` and this body:

```
{ "status": 404 }
```

### Simulate an outage

```
GET http://localhost:8093/status/503
```

The API responds with HTTP status `503 Service Unavailable` and the body
`{ "status": 503 }`.
