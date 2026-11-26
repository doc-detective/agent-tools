Results: 0 passed, 1 failed
  ✗ list-open-orders: Request to http://localhost:8096/api/orders?status=open failed: no response received.

This is an environment problem, not a problem with the doc or the spec: the Orders API isn't running, so nothing answered on `http://localhost:8096`. Start it as the README says (`docker compose up orders-api` in the `orders` service repository), then run the tests again. I didn't change any files.
