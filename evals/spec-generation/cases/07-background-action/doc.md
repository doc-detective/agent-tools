# Run a background action

Some actions in the demo app run in the background and report back when they
finish. The activity page shows both a startup notice and the result of any action
you trigger.

## Open the activity page

1. Go to `http://localhost:8092/wait-delay.html`.

2. Wait a moment while the page finishes starting up. After about two seconds, the
   notice **Loaded after 2 seconds** appears near the top of the page.

## Trigger the action

3. Click **Trigger delayed action**.

   The action takes a fraction of a second to complete. When it's done, the message
   **Action complete!** appears below the button.
