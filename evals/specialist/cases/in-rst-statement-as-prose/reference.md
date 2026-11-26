Neither of your step statements is a reST comment, so Doc Detective never reads them.

- **The `goTo` statement has no blank line above it.** A `..` line right under a paragraph continues that paragraph, so it's prose, not a comment. Each reST statement needs a blank line before and after it. Because the line is prose, step detection reads its bare URL as a link. The URL runs to the next space, trailing `"}` included, so Doc Detective adds a `checkLink` to `http://localhost:8092/"}`. That's the 404.
- **The `find` statement's second line isn't indented.** A reST comment holds its first line plus the indented block below it. The `"click": true}}` line starts at the margin, so it ends the comment. The JSON left in the comment is incomplete, and Doc Detective drops the step.

Put a blank line around each statement, and indent continuation lines:

```rst
.. test {"testId": "standard-button"}

Open the `demo page <http://localhost:8092/>`_.

.. step {"goTo": "http://localhost:8092/"}

Click **Standard Button**.

.. step {"find": {"selector": "button", "elementText": "Standard Button",
   "click": true}}

.. test end
```

Putting the whole `find` step on one line works too. Step detection still adds a `checkLink` for the demo-page link and `click` and `find` steps for the bold text, which pass against this page.
