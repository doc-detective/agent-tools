# Manage users with the API

The demo API at `http://localhost:8093` stores your workspace's users. Use these
requests to list users, invite a user, and remove a user.

## List users

The user list comes in pages. To get the second page, send a `GET` request to
`http://localhost:8093/api/users?page=2`:

```bash
curl "http://localhost:8093/api/users?page=2"
```

The API responds with `200 OK`.

## Invite a user

> [!NOTE]
> An invitation expires after seven days.

Send the person's email address and role in the body of a `POST` request:

```bash
curl -X POST http://localhost:8093/api/invites \
  -H "Content-Type: application/json" \
  -d '{"email": "ada@example.com", "role": "editor"}'
```

The API echoes the invitation back, with the same `email` and `role`.

## Remove a user

You can't undo this. To remove the user with ID `2`, send a `DELETE` request to
`http://localhost:8093/api/users/2`. The API responds with `200 OK`.
