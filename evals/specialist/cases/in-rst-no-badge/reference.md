No. Nothing turns it on, because Doc Detective doesn't write verification results into `.rst` files. It reads tests from RST, but it skips RST files when it writes dates, and it doesn't warn. In an RST file, `badge: true` on a `test` statement, a `verified-by` entry, and a `meta` statement have no effect, and `verification.write` leaves the file unchanged.

To record when the RST test last passed, name its `testId` in a `verified-by` entry on a page in a format Doc Detective writes to: Markdown or MDX, AsciiDoc, HTML, or DITA. For example, in a Markdown page's front matter:

```markdown
---
title: Install status
verified-by:
  - tool: doc-detective
    check: install-guide
---
```

Include that page in the same run as `install.rst`. When the `install-guide` test passes, Doc Detective fills in the entry's `version` and `passed` date and sets `last-verified` on that page. The page doesn't need tests of its own.
