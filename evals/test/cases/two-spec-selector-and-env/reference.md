Results after the fix loop: 1 passed, 1 failed, 1 unresolved.

- reveal-by-selector: fixed. The test was wrong: its click used `#reveal-selector`, which isn't on the page. The **Reveal by selector** button the doc names is `#reveal-by-selector`. I corrected the selector (confidence 90) and reran; it passes.
- open-orders-feed: unresolved, and not a doc or test problem. The request to `http://localhost:8096/api/orders?status=open` got no response because the Orders API isn't running. Start it as the README says (`docker compose up orders-api` in the `orders` service repository), then run the tests again. I didn't change this test.
