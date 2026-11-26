# Get usage reports

## List the report types

<!-- test {"testId":"list-report-types"} -->
Send `GET http://localhost:8093/api/report-types?scope=team` with the header
`Accept: application/json`. The API returns `200 OK` and echoes the scope you
asked for: `{"scope": "team"}`.
<!-- step {"httpRequest":{"url":"http://localhost:8093/api/report-types?scope=team","method":"get","request":{"headers":{"Accept":"application/json"}},"statusCodes":[200],"response":{"body":{"scope":"team"}}}} -->
<!-- test end -->

## Download the latest report

<!-- test {"testId":"latest-report"} -->
Send `GET http://localhost:8099/reports/latest`. The reporting service returns
`200 OK` with the most recent report.
<!-- step {"httpRequest":{"url":"http://localhost:8099/reports/latest","method":"get","statusCodes":[200]}} -->
<!-- test end -->
