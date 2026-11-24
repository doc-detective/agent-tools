# Wait for delayed messages

Some messages on the demo pages appear only after a delay, and some text is laid
out with extra spacing. These checks show what a reader sees once the page
settles.

## Wait for the page message

<!-- test {"testId":"auto-message"} -->
1. Go to `http://localhost:8092/wait-delay.html`.
<!-- step {"goTo":"http://localhost:8092/wait-delay.html"} -->
2. Wait a few seconds. The message **Loaded after 2 seconds** appears.
<!-- step {"wait":2500} -->
<!-- step {"find":"Loaded after 2 seconds"} -->
<!-- test end -->

## Trigger a delayed action

<!-- test {"testId":"click-message"} -->
1. Go to `http://localhost:8092/wait-delay.html`.
<!-- step {"goTo":"http://localhost:8092/wait-delay.html"} -->
2. Click **Trigger delayed action**.
<!-- step {"click":"Trigger delayed action"} -->

   After a moment, **Action complete!** appears below the button.
<!-- step {"find":"Action complete!"} -->
<!-- test end -->

## Read the order summary

<!-- test {"testId":"order-summary"} -->
1. Go to `http://localhost:8092/find-text-matching.html`.
<!-- step {"goTo":"http://localhost:8092/find-text-matching.html"} -->
2. The summary reads **Submit Order**, followed by an order number such as
   **Order #4821**.
<!-- step {"find":"Submit Order"} -->
<!-- step {"find":{"selector":"#regex-target","elementText":"/Order #\\d+/"}} -->
<!-- test end -->
