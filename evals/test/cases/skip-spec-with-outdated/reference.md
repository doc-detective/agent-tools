Results: 0 passed, 1 failed, 1 skipped
  ✗ ordered-list: Couldn't find element `Step one`.
  - other-platform-input: SKIPPED

- ordered-list: the doc is out of date, so I didn't change the test. Step 2 of "Check the ordered list" says the list's first item reads **Step one**, and the spec checks the same text, but the page's ordered list starts with **First item**. Proposed doc edit: "Its first item reads **First item**.", with the spec's `find` updated to match. Should I apply it?
- other-platform-input: skipped by design, not a failure. Its `runOn` limits it to __OTHER_PLATFORM_NAME__ (`__OTHER_PLATFORM__`), as the doc says those steps apply only to that build, and this machine isn't that platform. Run the spec on a __OTHER_PLATFORM_NAME__ machine to exercise it.

I didn't change any files.
