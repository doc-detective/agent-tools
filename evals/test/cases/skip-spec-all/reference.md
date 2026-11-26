Results: 0 passed, 0 warned, 2 skipped.

Nothing failed. Both tests (type-preview and reveal-message) were skipped by design: the spec's `runOn` limits it to __OTHER_PLATFORM_NAME__ (`__OTHER_PLATFORM__`), as the doc says the procedure applies only to that build, and this machine isn't that platform. Doc Detective exits 2 when every test skips, which is why the run reported that nothing was tested. To exercise these tests, run the spec on a __OTHER_PLATFORM_NAME__ machine. I didn't change any files.
