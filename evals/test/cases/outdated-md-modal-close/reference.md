Results: 0 passed, 1 failed
  ✗ close-dialog: Couldn't find an element within `timeout` (5000 ms).

The doc is out of date, not the test. Step 3 of docs/dismiss-dialog.md tells readers to click the dialog's **Close** button, and the test clicks the element `[data-testid=modal-close]` with the text `Close`. That button is still in the dialog, but it now reads **Close Modal**. Other sections of the page still have **Close** buttons, but the note in the doc says not to use those, so pointing the test at one would test the wrong thing. I didn't change the test.

Proposed doc edit, step 3:

    3. Click the dialog's **Close Modal** button.
    <!-- step {"click":{"selector":"[data-testid=modal-close]","elementText":"Close Modal"}} -->

Should I apply it?
