# Check that the platform is healthy

Before you page anyone about a problem, check the two places that show whether the
platform is up.

## Check the API

Send `GET http://localhost:8093/api/users?page=1`. The API returns `200 OK` and
echoes the page you asked for: `{"page": "1"}`.

## Check the status page

Open the status page at
[http://localhost:8098/health](http://localhost:8098/health). It lists each
service and its last check.
