# Dismiss the welcome dialog

The demo page shows a short welcome message in its **Modal Dialog** section.
Close the dialog when you're done reading it.

## Close the dialog

<!-- test {"testId":"close-dialog"} -->
1. Go to `http://localhost:8092/enhanced-elements.html`.
<!-- step {"goTo":"http://localhost:8092/enhanced-elements.html"} -->
2. Scroll to the **Modal Dialog** section. It shows **Modal Title** and a short
   message.
<!-- step {"find":"Modal Title"} -->
3. Click the dialog's **Close** button.
<!-- step {"click":{"selector":"[data-testid=modal-close]","elementText":"Close"}} -->
<!-- test end -->

> **Note:** Other sections of the page have **Close** buttons of their own. Use the
> one inside the dialog.
