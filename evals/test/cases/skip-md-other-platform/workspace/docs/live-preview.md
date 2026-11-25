# Use the live preview

The live preview shows exactly what you type, as you type it. Use it to check the
spelling of a name or code before you save it anywhere else.

## Preview your text

<!-- test {"testId":"preview-text"} -->
1. Go to `http://localhost:8092/type-echo.html`.
<!-- step {"goTo":"http://localhost:8092/type-echo.html"} -->
2. In the **Type here:** field, enter `Hello, Doc Detective`.
<!-- step {"type":{"keys":"Hello, Doc Detective","selector":"#type-input"}} -->

   The preview line below the field reads **Hello, Doc Detective**.
<!-- step {"find":{"selector":"#echo","elementText":"Hello, Doc Detective"}} -->
<!-- test end -->

## On __OTHER_PLATFORM_NAME__: check the field label

The __OTHER_PLATFORM_NAME__ build of the browser renders the field with its label,
**Type here:**, above it.

<!-- test {"testId":"other-platform-label","runOn":[{"platforms":["__OTHER_PLATFORM__"],"browsers":[{"name":"chrome","headless":true}]}]} -->
1. Go to `http://localhost:8092/type-echo.html`.
<!-- step {"goTo":"http://localhost:8092/type-echo.html"} -->
2. Check that the **Type here:** label shows.
<!-- step {"find":"Type here:"} -->
<!-- test end -->
