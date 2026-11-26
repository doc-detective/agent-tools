Doc Detective has no `highlight` annotation. The six types are `outline`, `arrow`, `badge`, `callout`, `blur`, and `text`. Each annotation names exactly one type, so the schema rejects an object that names two, such as an outline and an arrow. Put the box and the arrow in two annotation objects in the same `annotations` list.

`style` has no fill. Its fields are `color`, `background` (for text-bearing types), `strokeWidth`, `fontSize`, `fontFamily`, `opacity`, `radius`, `padding`, `maxWidth`, and `intensity`. To mark the button, draw an `outline` and style its stroke:

```json
{
  "tests": [
    {
      "steps": [
        { "goTo": "http://localhost:8092/" },
        {
          "screenshot": {
            "path": "standard-button.png",
            "annotations": [
              { "outline": "Standard Button", "style": { "color": "#EAB308", "strokeWidth": 4, "opacity": 0.8 } },
              { "arrow": "Standard Button", "style": { "color": "#EAB308" } }
            ]
          }
        }
      ]
    }
  ]
}
```

Doc Detective composites both into the saved image without touching the page.
