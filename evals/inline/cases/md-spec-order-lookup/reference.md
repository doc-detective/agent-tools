# Look up an order

The order summary page shows the product, the order number, and the actions you
can take on the order.

<!-- test {"testId":"order-lookup"} -->
1. Go to `http://localhost:8092/find-text-matching.html`.
   <!-- step {"goTo":"http://localhost:8092/find-text-matching.html"} -->

2. Check the product name at the top of the summary: **Garden companion API**.
   <!-- step {"find":"Garden companion API"} -->

3. Find the order number. It's `Order #` followed by four digits, for example
   `Order #1234`. Every order gets its own number, so don't expect a particular
   one.
   <!-- step {"find":{"elementText":"/Order #[0-9]{4}/"}} -->

4. Confirm that the summary offers both actions: **Submit Order** and
   **Save changes**.
   <!-- step {"find":"Submit Order"} -->
   <!-- step {"find":"Save changes"} -->
   <!-- test end -->
