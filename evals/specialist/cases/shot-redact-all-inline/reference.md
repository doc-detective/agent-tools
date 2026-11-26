`all` needs an object target. A string such as `".multi"` could be a selector or display text, so with `"all": true` Doc Detective can't tell which you mean, and the step fails with `"all": true needs an explicit target object`. Name the field instead: `{"selector": ".multi"}`.

Keep `all`. Without it, a `blur` covers only the first match, and the other buttons stay readable in an image that looks redacted.

Put the statements in Markdown comments: `<!-- test ... -->` opens the test, each `<!-- step ... -->` adds a step, and `<!-- test end -->` closes it.

```markdown
<!-- test {"testId": "redacted-buttons"} -->

Open the [multiple matches page](http://localhost:8092/multiple-matches.html).

<!-- step {"goTo": "http://localhost:8092/multiple-matches.html"} -->

The page lists three buttons.

<!-- step {"screenshot": {"path": "buttons.png", "annotations": [{"blur": {"selector": ".multi"}, "all": true}]}} -->

<!-- test end -->
```
