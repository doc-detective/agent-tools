Results after the fix: 1 passed, 0 failed.

The first run failed at step 3: `Couldn't find element `Object clik landed`.` The test was wrong, not the doc. The doc and the page both say **Object click landed**, and the step comment misspelled it. I corrected the `find` step in docs/preview-messages.md (confidence 95) and reran the test. It passes now. The doc's prose is unchanged.
