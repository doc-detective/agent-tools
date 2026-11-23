# List users with the API

Use the `/api/users` endpoint to page through the users in your workspace. The
demo API runs at `http://localhost:8093`.

## Request a page of users

Send a `GET` request to `/api/users` with the `page` query parameter:

```
GET http://localhost:8093/api/users?page=2
```

The request needs no body and no authentication.

## Check the response

A successful request returns HTTP status `200 OK` and a JSON body. The demo API
echoes back the query parameters it received, so you can confirm that your client
built the request correctly:

```
{
  "page": "2"
}
```

> **Note:** Query parameter values always come back as strings, even when you send a
> number.
