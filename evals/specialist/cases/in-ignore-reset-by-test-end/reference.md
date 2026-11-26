The `<!-- test end -->` inside the ignore block switches the ignore block off. A `test end` statement closes the current test and also ends any ignore block it sits in. Everything after it, up to `<!-- test ignore end -->`, is read and detected again.

So the status-page link above `test end` is ignored, and the support-portal link below it isn't. Step detection turns that link into a `checkLink` step. The `buttons` test is already closed, so the step sits outside any test, and Doc Detective puts it in a test it creates on its own, with a generated ID. That's `buttons.md~7d7c74ca`, and it fails on the 404.

Move `<!-- test end -->` out of the ignore block, above `<!-- test ignore start -->`:

```markdown
<!-- test {"testId": "buttons"} -->

Open the [demo page](http://localhost:8092/).

<!-- step {"goTo": "http://localhost:8092/"} -->

Click the button labeled Standard Button.

<!-- step {"click": "Standard Button"} -->

<!-- test end -->

<!-- test ignore start -->

## Troubleshooting

If the button does nothing, check the [internal status page](http://localhost:8092/status/503).

You can also ask in the [support portal](http://localhost:8092/status/404).

<!-- test ignore end -->
```

Now nothing between `test ignore start` and `test ignore end` is detected, and the run has only the `buttons` test.
