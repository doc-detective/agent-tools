# Update a user record

The demo API stores user records under `/api/users/{id}`. Use `PUT` to replace a
whole record and `PATCH` to change individual fields. Every response repeats the
fields you sent, so you can confirm the update. The `X-Echo-Path` response header
shows which record the API changed.

The examples on this page update user `42`.

## Replace a record

1. Send a `PUT` request to `http://localhost:8093/api/users/42` with this JSON
   body:

   ```
   { "name": "Grace Hopper", "job": "admiral" }
   ```

   The API responds with `200 OK` and returns the same `name` and `job`. The
   `X-Echo-Path` header reads `/api/users/42`.

## Change one field

2. Send a `PATCH` request to `http://localhost:8093/api/users/42` with only the
   field you want to change:

   ```
   { "job": "rear admiral" }
   ```

   The response body contains `job` with its new value.

## List the user's shipped orders

3. Send a `GET` request to `http://localhost:8093/api/users/42/orders` with the
   query parameter `status=shipped`.

   The API echoes your filter back as `{ "status": "shipped" }`, and the
   `X-Echo-Path` header reads `/api/users/42/orders`.
