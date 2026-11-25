Results after the fix: 1 passed, 0 failed.

The first run stopped before anything executed: the inline test in docs/object-message.md was invalid. Its click step set `button` to `primary`, and Doc Detective accepts only `left`, `right`, or `middle` (`click.button: must be one of left, right, middle (got "primary")`). The doc means the left button, so I changed the value to `left` in the step comment, left the prose as it was, and reran. The test passes: after the click, **Object click landed** appears, as the doc says.
