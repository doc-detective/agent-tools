Doc Detective handles the two pairs differently, and it resizes the browser for neither.

**The cropped card (1321×433 reference, 1321×432 capture).** Doc Detective doesn't resize the window for a step with `crop`, because a cropped image's size comes from the element, not the window. The images still differ in size, so it checks the aspect ratios first: they're within 5% of each other, so the comparison runs. Each dimension is within 5%, so it compares only the region the two images share, starting at the top-left corner. Unchanged content reports no difference, so the step passes and the reference stays as it is.

**The full viewport (2400×1600 reference, 1200×800 capture).** Both dimensions differ by the same factor, 2, which means a different pixel density rather than a different size. Doc Detective doesn't resize the window for that. It scales both images to the smaller size, 1200×800, and compares them.

If two images' aspect ratios differ by more than 5%, Doc Detective doesn't compare them, and the step fails.

For an uncropped capture that differs in size by something other than a uniform factor, Doc Detective usually resizes the browser window to the reference's size, takes the screenshot again, compares that one, and reports the resize in `$$resizedToReference`. Once a new environment is permanent, refresh the references with `"overwrite": "true"`.
