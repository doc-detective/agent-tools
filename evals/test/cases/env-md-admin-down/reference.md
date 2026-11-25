Results: 1 passed, 1 failed
  ✓ storefront-home
  ✗ admin-orders: Couldn't open URL: net::ERR_CONNECTION_REFUSED (`http://localhost:8097/admin/orders`).

admin-orders failed because of the environment, not the doc or its test: nothing is listening on `http://localhost:8097`, so the admin console isn't running. The storefront on 8092 is a separate app, which is why storefront-home passed. Start the admin console as the README says (`npm run admin` from the `storefront` repository), then run the tests again. I didn't change any files.
