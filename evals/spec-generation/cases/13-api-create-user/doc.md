# Create a user with the API

Add a user to your workspace by sending their details to the `/api/users`
endpoint of the demo API at `http://localhost:8093`.

## Send the request

Send a `POST` request with a JSON body that contains the user's `name` and `job`:

```
POST http://localhost:8093/api/users
Content-Type: application/json

{
  "name": "morpheus",
  "job": "leader"
}
```

## Check the response

The API responds with HTTP status `200 OK`. The response body contains the user
record as stored, including the `name` and `job` you sent:

```
{
  "name": "morpheus",
  "job": "leader"
}
```

If the response is missing either field, check that you set the `Content-Type`
header to `application/json`.
