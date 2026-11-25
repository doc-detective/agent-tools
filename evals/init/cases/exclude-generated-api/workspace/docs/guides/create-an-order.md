# Create an order

Orders hold the items a customer bought. Create one with the Orders API.

## Create an order

Send a `POST` request to `http://localhost:8093/api/orders` with this JSON body:

```json
{ "sku": "W-100", "quantity": 2 }
```

The API responds with `200 OK` and echoes the order: the same `sku` and `quantity`.
