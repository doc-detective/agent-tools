# List users with the API

Use the `/api/users` endpoint to page through the users in your workspace. The
demo API runs at `http://localhost:8093`.

## Request a page of users

<!-- test {"testId":"list-users"} -->
Send a `GET` request to `/api/users` with the `page` query parameter:

```
GET http://localhost:8093/api/users?page=2
```

A successful request returns HTTP status `200 OK` and a JSON body that echoes the
query parameters it received:

```
{
  "page": "2"
}
```
<!-- step {"httpRequest":{"url":"http://localhost:8093/api/users?page=2","method":"get","statusCodes":[200],"response":{"body":{"page":"2"}}}} -->
<!-- test end -->

> **Note:** Query parameter values always come back as strings, even when you send a
> number.
