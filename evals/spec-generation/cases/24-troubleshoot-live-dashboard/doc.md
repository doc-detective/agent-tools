# Troubleshoot a dashboard that won't update

If the live dashboard stops updating, work through these checks in order. Each
one confirms that one part of the demo app is working.

## Check the API

1. Send a `GET` request to `http://localhost:8093/status/200`.

   A healthy API responds with `200 OK`.

## Check the web server

2. Go to `http://localhost:8092/waitUntil-test-static.html`.

   The page reads **Content is available immediately.** If you see it, the web
   server is serving pages.

## Check live updates

3. Go to `http://localhost:8092/waitUntil-test-network-forever.html`.

   The live panel polls the API several times a second for as long as the page is
   open, so the page never finishes loading in the usual sense. Don't wait for the
   browser's loading indicator to stop.

4. Read the counter in the live panel. It has the form **Request #N completed**,
   where N goes up with every poll, so the number you see changes each time you
   look. If the counter is moving, live updates work.

## Still not updating?

If the panel stays on **Loading...**:

- Restart the API with `npm run restart:api`.
- Clear your browser cache and reload the page.
- If neither helps, email support@example.com with a screenshot of the panel.
