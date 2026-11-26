# Acme Orders API

A small API for orders. It runs at `http://localhost:8093`.

## Create an order

Send a `POST` request to `http://localhost:8093/api/orders` with this JSON body:

```json
{ "sku": "W-100", "quantity": 2 }
```

The API responds with `200 OK` and echoes the order: the same `sku` and `quantity`.

## List users

Send `GET http://localhost:8093/api/users?page=2`. The API responds with `200 OK`
and the query it received: `{"page": "2"}`.

## License

MIT
