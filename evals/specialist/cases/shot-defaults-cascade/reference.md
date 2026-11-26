The theme resolves key by key. A test's `annotationDefaults` overrides the spec's, which overrides the config's, and an individual annotation's `style` overrides all of them. A level that doesn't set a key defers to the level above. A per-type block, such as `badge`, overrides the base properties for that type only.

In that test:

- The `outline` is `#2563EB`. The test's theme sets only a `badge` block, so the base `color` comes from the spec, which beats the config's `#E11D48`.
- The badge with no `style` gets the `#16A34A` background from the test's `badge` block.
- The badge with `"style": {"background": "#000000"}` gets `#000000`, because the annotation's own `style` wins over every theme level.

`annotationDefaults` goes on the config, a spec, or a test. It isn't a step field, so a `screenshot` step that sets it fails validation. To style one screenshot differently, set `style` on its annotations:

```json
{
  "screenshot": {
    "path": "form.png",
    "annotations": [
      { "outline": "#login-form", "style": { "color": "#E11D48", "strokeWidth": 3 } },
      { "badge": "#username", "label": "1", "style": { "background": "#E11D48", "color": "#FFFFFF" } }
    ]
  }
}
```
