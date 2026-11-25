# Users API

The demo API runs at `http://localhost:8093`.

## List users

Send `GET http://localhost:8093/api/users?page=2`. The API returns `200 OK` and
echoes the query parameters: `{"page": "2"}`.

## Create a user

Send `POST http://localhost:8093/api/users` with the JSON body
`{"name": "morpheus", "job": "leader"}`. The API returns `200 OK` and the user
record as stored, with the same `name` and `job`.
