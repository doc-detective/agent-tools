It isn't timing. A plain string target matches an element's whole text, not a substring. The button's text is "Standard Button", so `"Standard"` matches nothing.

`resultCode: drift` says so. Doc Detective found no match, but it found similar elements, and it lists them in `outputs.nearMatches` and in the `resultHint`. The element was on the page the whole time, so a longer timeout only makes the step wait longer before it fails the same way.

Then target the button's whole text:

```json
{ "click": "Standard Button" }
```

To match part of the text instead, wrap it in slashes as a regular expression, such as `"click": "/Standard/"`. A regular expression matches anywhere in the text, so make sure it matches only the element you want.
