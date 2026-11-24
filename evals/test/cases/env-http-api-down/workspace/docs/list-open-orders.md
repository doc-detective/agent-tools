# List open orders

To see the orders that haven't shipped yet, filter the orders list by status.

Send a `GET` request to `/api/orders` with `status=open`:

```
GET http://localhost:8096/api/orders?status=open
```

The API returns `200 OK`, and the response echoes the filter it applied:

```
{
  "status": "open"
}
```
