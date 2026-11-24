1 passed, 1 warned, 0 skipped.

Nothing failed, so there was nothing to fix, and I didn't change any files.

- users-page-1: PASS.
- users-page-2: WARNING. The request returned `200` and the response matched what the doc says (`{"page": "2", "per_page": "6"}`), but it differed from the copy saved in `snapshots/users-page-2.json` by 0.53, more than the step's `maxVariation` of 0.1. The saved copy also has `total` and `total_pages`, which the API no longer returns. Because the step sets `overwrite` to `"false"`, Doc Detective left the saved copy as it was.

If the new response is what you expect, refresh the saved copy (delete it and run the spec once, or set `overwrite` to `"aboveVariation"` for one run). I can do that if you want.
