# Create an order

Create an order for a product by its SKU.

1. Send a `POST` request to `http://localhost:8093/api/orders` with this JSON body:

   ```json
   { "sku": "W-300", "quantity": 3 }
   ```

2. Check that the API responds with `201 Created`.
3. Check that the response body echoes the `sku` and `quantity` you sent.
