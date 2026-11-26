# Page through users

The demo API at `http://localhost:8093` returns users a page at a time.

## Request a page

Send `GET http://localhost:8093/api/users` with `page` and, optionally,
`per_page`. The API returns `200 OK` and echoes the paging you asked for.

```
GET http://localhost:8093/api/users?page=1
```

returns `{"page": "1"}`, and

```
GET http://localhost:8093/api/users?page=2&per_page=6
```

returns `{"page": "2", "per_page": "6"}`.
