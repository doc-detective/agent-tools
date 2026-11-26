Each step breaks a different AsciiDoc rule, so Doc Detective reads neither:

- The `goTo` statement is indented. An AsciiDoc statement counts only when `//` starts its line. An indented line isn't a comment at all. AsciiDoc treats it as a literal paragraph, which Doc Detective doesn't read and your page shows as text.
- The `click` statement has no parentheses. Statements go in parentheses, as `// (step {...})`. The parentheses set them apart from regular comments, so `// step {...}` stays an ordinary comment.

Start each statement at the beginning of its line, in parentheses:

```asciidoc
// (test {"testId": "standard-button"})

. Open the demo page.
+
// (step {"goTo": "http://localhost:8092/"})
. Click the button.
+
// (step {"click": "Standard Button"})

// (test end)
```
