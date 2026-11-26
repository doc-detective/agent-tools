Results: 1 passed, 1 failed
  ✓ api-users
  ✗ status-page: Invalid or unresolvable URL: http://localhost:8098/health

status-page failed because of the environment, not the doc or the spec. Doc Detective calls the URL "invalid or unresolvable", but the URL is fine: nothing is listening on `http://localhost:8098`, so the status service isn't running. Start it as the README says (`docker compose up status` from the `platform` repository), then run the tests again. I didn't change any files.
