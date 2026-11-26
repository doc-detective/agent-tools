`elementText` matches an element's entire visible text, not part of it. Doc Detective trims the text and collapses runs of whitespace, then compares the whole thing. "demonstrates the paragraph element" is only a fragment of that paragraph's text, so no element matches and the step times out.

Your `selector` isn't the problem. When you combine `selector` and `elementText`, the element must match both, and the paragraph does match `p`.

To match part of the text, wrap the value in slashes. Doc Detective then treats it as a regular expression that can match anywhere in the text:

```json
{
  "tests": [
    {
      "steps": [
        { "goTo": "http://localhost:8092/" },
        {
          "find": {
            "selector": "p",
            "elementText": "/demonstrates the paragraph element/"
          }
        }
      ]
    }
  ]
}
```

The regular expression is case-sensitive. To require the whole text, give the full sentence, or anchor the expression with `^` and `$`.
