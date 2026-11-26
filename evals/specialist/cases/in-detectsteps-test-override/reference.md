You can't. The test-level setting doesn't override the config in that direction. `detectSteps: false` in the config turns step detection off for every file, and `"detectSteps": true` on a `test` statement doesn't turn it back on. A test's `detectSteps` can only turn detection off for that one test.

So nothing on the page is detected, and the `checkout` test ends up with no steps. A test needs at least one step, so Doc Detective can't build a valid test from it and skips it. That's the `Couldn't convert test` message.

To detect steps on that page, pick one:

- **Flip the defaults.** Remove `detectSteps` from the config, so it's `true`, and add `"detectSteps": false` to the `test` statements where detection is noise, such as `<!-- test {"testId": "billing", "detectSteps": false} -->`. Content outside any `test` statement is still detected.
- **Run that page with its own config.** Keep `.doc-detective.json` as it is, and run the checkout page with a second config that leaves detection on:

  ```bash
  npx doc-detective --config detect.doc-detective.json --input docs/checkout.md
  ```

- **Write the steps yourself.** `step` statements work whether detection is on or off, as in `<!-- step {"click": "Place order"} -->`.
