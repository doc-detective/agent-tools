`crop` has no `scrollOffset`, and no other scroll setting. You don't need one. Before the capture, Doc Detective scrolls the crop target to the center of the viewport, then cuts the element's padded box out of the capture. A fixed header or footer sits at the viewport's edge, so it doesn't cover a centered element.

```json
{
  "tests": [
    {
      "steps": [
        { "goTo": "http://localhost:8092/crop-sticky-header.html" },
        {
          "screenshot": {
            "path": "learn-more.png",
            "crop": { "selector": "#learn-more", "padding": 10 }
          }
        }
      ]
    }
  ]
}
```

`Element can't fit in viewport.` is a different problem. A crop needs the whole element, plus its padding, inside the viewport. `main` is taller than the viewport, so the step fails. Crop to a smaller element, or give the context a larger browser `viewport`. A headless browser isn't limited by the display size. The step's `$$fitsViewport` output reports whether the cropped element fit.

Centering moves the page. After a cropped screenshot, the page stays scrolled to the element, so a later step that depends on the scroll position sees the element centered.
