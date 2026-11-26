Results: 1 passed, 0 warned, 1 skipped.

- request-export: PASS.
- desktop-helper: SKIPPED, by design. Its `runOn` limits it to __OTHER_PLATFORM_NAME__ (`__OTHER_PLATFORM__`), because the desktop helper it calls exists only in the __OTHER_PLATFORM_NAME__ desktop app, as the doc says. This machine isn't that platform, so Doc Detective didn't run it. That isn't a failure, so there was nothing to fix. To exercise it, run the spec on a __OTHER_PLATFORM_NAME__ machine with the desktop app running.

I didn't change any files.
