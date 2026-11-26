Results after the fix: 1 passed, 0 failed.

The first run failed at the `type` step: it couldn't find `#type-field`. The test was wrong, not the doc. The doc describes the **Type here:** field, and on the page that field's selector is `#type-input`; nothing matches `#type-field`. I changed the selector in tests/live-preview.spec.json (confidence 90) and reran. The test passes, and the preview reads **Hello, Doc Detective** as the doc says.
