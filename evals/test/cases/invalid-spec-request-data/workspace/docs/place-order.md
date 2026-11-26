# Place an order with the API

Create an order by sending the item and quantity to the `/api/orders` endpoint of
the demo API at `http://localhost:8093`.

## Send the order

```
POST http://localhost:8093/api/orders
Content-Type: application/json

{
  "item": "notebook",
  "quantity": 2
}
```

## Check the response

The API returns `200 OK` and echoes the order it received:

```
{
  "item": "notebook",
  "quantity": 2
}
```
