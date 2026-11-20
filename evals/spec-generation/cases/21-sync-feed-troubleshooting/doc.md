# Watch the sync feed

The sync feed shows changes from other devices as they arrive. Use it to confirm
that a sync finished before you start editing.

## Watch a sync

1. Go to `http://localhost:8092/waitUntil-test-dom-mutations.html`.

   The page heading reads **DOM Mutations Test**.

2. Watch the feed fill in. Entries arrive one at a time, numbered from
   **Dynamic content #1** to **Dynamic content #5**.

3. When the last entry arrives, the feed shows **All mutations complete**. The
   sync is done and you can start editing.

## If the sync stalls

If the feed stops before **All mutations complete** appears:

- Disconnect from your VPN, wait a minute, and reconnect.
- Restart your computer and open the page again.
- If it still stalls, open a ticket with IT support and attach a screenshot of
  the feed.
