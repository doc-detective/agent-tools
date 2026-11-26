# Platform docs

Operations pages for the demo platform.

## Test the docs

The specs in `tests/` call two local services:

- The demo API on `http://localhost:8093`.
- The status service on `http://localhost:8098`. It isn't part of the docs site.
  Start it with `docker compose up status` from the `platform` repository.
