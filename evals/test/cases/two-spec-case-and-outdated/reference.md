Results after the fix loop: 1 passed, 1 failed, 1 unresolved.

Both tests failed with the same message (`Couldn't find an element within timeout (5000 ms)`), but for different reasons.

- submit-order: fixed. The test was wrong: it looked for `Submit order` on `#primary-action`, but the doc and the page both say **Submit Order**. I corrected the capitalization in tests/checkout-buttons.spec.json (confidence 95) and reran; it passes.
- login-button: unresolved, because the doc is out of date. Step 3 of docs/checkout-buttons.md says the login button reads **Sign in**, and the spec checks the same text, but the button now reads **Login Submit**. I didn't change this test, since making it pass would hide the stale doc. Proposed doc edit, step 3: "It reads **Login Submit**.", with the spec's `elementText` updated to match. Want me to apply it?
