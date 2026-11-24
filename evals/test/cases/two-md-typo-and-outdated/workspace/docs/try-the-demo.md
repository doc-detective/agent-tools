# Try the demo app

Two short tasks show the demo app's preview features.

## Preview your text

<!-- test {"testId":"live-preview"} -->
1. Go to `http://localhost:8092/type-echo.html`.
<!-- step {"goTo":"http://localhost:8092/type-echo.html"} -->
2. In the **Type here:** field, enter `Hello, Doc Detective`.
<!-- step {"type":{"keys":"Hello, Doc Detective","selector":"#type-input"}} -->

   The preview line below the field reads **Hello, Doc Detective**.
<!-- step {"find":{"selector":"#echo","elementText":"Hello, Doc Detectve"}} -->
<!-- test end -->

## Add a sample message

<!-- test {"testId":"sample-message"} -->
1. Go to `http://localhost:8092/click-shorthand.html`.
<!-- step {"goTo":"http://localhost:8092/click-shorthand.html"} -->
2. Click **Show by object**.
<!-- step {"click":"Show by object"} -->

   The message **Object click landed** appears below the buttons.
<!-- step {"find":"Object click landed"} -->
<!-- test end -->
