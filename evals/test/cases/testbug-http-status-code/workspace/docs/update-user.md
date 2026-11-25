# Update a user's job title

Change a user's job title with a `PUT` request to `/api/users/<id>` on the demo
API at `http://localhost:8093`.

## Send the update

Send the user's `name` and new `job` as JSON:

```
PUT http://localhost:8093/api/users/2
Content-Type: application/json

{
  "name": "morpheus",
  "job": "zion resident"
}
```

## Check the response

The API returns `200 OK`, and the response body is the updated user record:

```
{
  "name": "morpheus",
  "job": "zion resident"
}
```

> **Note:** Some APIs answer an update with `204 No Content` and an empty body.
> This one returns the record, so you can confirm the change in the same call.
