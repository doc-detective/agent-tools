No. A `click` string always names the element to click. `{"click": "right"}` looks for an element whose text is "right", so on this page it fails with ``Couldn't find element `right`.`` It doesn't act on the element an earlier `find` located.

To right-click with `click`, use the object format. Name the element with a locator and set `button` to `"right"`:

```json
{
  "tests": [
    {
      "steps": [
        { "goTo": "http://localhost:8092/click-shorthand.html" },
        {
          "click": {
            "elementText": "Reveal by selector",
            "button": "right"
          }
        },
        { "find": "Right-click landed" }
      ]
    }
  ]
}
```

`find` reads a `click` string the other way. There, the string names the mouse button, so `{"find": {"elementText": "Reveal by selector", "click": "right"}}` finds the button and right-clicks it in one step. `button` also takes `"left"` (the default) and `"middle"`.
