Results: 0 passed, 1 failed
  ✗ home-page-tour: Couldn't find element `Common UI Elements`.

The doc is out of date. The spec checks what docs/home-page-tour.md says, and step 1 of the doc promises the page title **Common UI Elements**. The page's title is now **Common HTML Elements**. I left the spec alone, because changing it to pass would stop it from catching the stale doc.

Proposed fix: in docs/home-page-tour.md step 1, change **Common UI Elements** to **Common HTML Elements**, and update the spec's `find` step to match. Want me to make both changes?
