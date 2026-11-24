Results after the fix loop: 1 passed, 1 failed, 1 unresolved.

- live-preview: fixed. The test was wrong: its `find` step looked for `Hello, Doc Detectve`, a typo for **Hello, Doc Detective**, which the doc and the page both show. I corrected the step (confidence 95) and reran; it passes.
- sample-message: unresolved, because the doc is out of date. Step 2 says to click **Show by object**, and the test matches the doc, but the button now reads **Reveal by object**. I didn't change this test, since making it pass would hide the stale doc. Proposed doc edit, step 2: "Click **Reveal by object**." with the step comment `{"click":"Reveal by object"}`. Want me to apply it?
