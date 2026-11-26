# Create an invoice

1. Make sure the billing API is running (see the README).
2. Send a `POST` request to `http://localhost:8096/api/invoices` with this body:

   ```json
   { "customer": "C-42", "amount": 1200 }
   ```

3. Check that the API responds with `201 Created`.
