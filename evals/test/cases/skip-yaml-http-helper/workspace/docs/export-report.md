# Export a usage report

## Request a CSV export

Send `GET http://localhost:8093/api/reports?format=csv`. The API returns `200 OK`
and echoes the format it will export: `{"format": "csv"}`.

## On __OTHER_PLATFORM_NAME__: send the export to the desktop helper

The __OTHER_PLATFORM_NAME__ desktop app runs a local helper on
`http://localhost:8095` that files exported reports in your Downloads folder. The
helper exists only on __OTHER_PLATFORM_NAME__; other platforms save the export from
the browser instead.

Send `POST http://localhost:8095/api/inbox` with the body
`{"report": "usage.csv"}`. The helper returns `200 OK`.
