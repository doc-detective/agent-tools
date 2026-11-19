# Verify your installation

After you install the demo app, run these checks to confirm that the API and the
web app both work and can talk to each other.

## Check the API

1. Send a `GET` request to `http://localhost:8093/status/200`.

   The API responds with `200 OK` and the body `{ "status": 200 }`.

2. Register a test session by sending a `POST` request to
   `http://localhost:8093/api/sessions` with this JSON body:

   ```
   { "user": "install-check" }
   ```

   The API responds with `200 OK` and echoes the `user` value back to you.

## Check the web app

3. In your browser, go to `http://localhost:8092`.

   You should see the heading **Common HTML Elements**.

4. Go to `http://localhost:8092/type-echo.html` and enter `install-check` in the
   **Type here** field.

   The preview below the field reads **install-check**. Your installation is ready.
