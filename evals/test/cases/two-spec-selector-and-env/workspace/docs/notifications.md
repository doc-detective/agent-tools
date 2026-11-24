# Check your notifications

## Add a message by its button ID

1. Go to `http://localhost:8092/click-shorthand.html`.

2. Click **Reveal by selector**.

   The message **Selector click landed** appears below the buttons.

## Check the open orders feed

The panel lists open orders from the Orders API. To check the feed directly, send
`GET http://localhost:8096/api/orders?status=open`. The API returns `200 OK` and
echoes the filter: `{"status": "open"}`.
