Results: 0 passed, 1 failed
  ✗ create-note: Couldn't open URL: net::ERR_CONNECTION_REFUSED (http://localhost:8095/notes)

This is an environment problem, not a problem with the doc or its test. Nothing is listening on `http://localhost:8095`, so the first step couldn't open the page and the rest were skipped. The README says the tests need the Acme Notes app running locally: start it with `npm run dev` in the `acme-notes` app repository, then run the tests again. I didn't change any files.
