Results: 0 passed, 1 failed
  ✗ preview-messages: Couldn't find element `Show by text`.

The doc is out of date, not the test. Step 2 of docs/preview-messages.md tells readers to click **Show by text**, and the test clicks the same label, but the page's button now reads **Reveal by text**. I didn't change the test: making it pass would hide the problem in the doc.

Proposed doc edit, step 2:

    2. Click **Reveal by text**.
    <!-- step {"click":"Reveal by text"} -->

Should I apply it?
