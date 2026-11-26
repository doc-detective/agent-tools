# Write a quick note

Echo Pad shows what you type as you type it, so you can check a note before you
save it.

## Check a note

<!-- test {"testId":"check-a-note"} -->
1. Go to http://localhost:8092/type-echo.html.
<!-- step {"goTo":"http://localhost:8092/type-echo.html"} -->
2. In the **Type here** field, type `draft note`.
<!-- step {"type":{"keys":"draft note","selector":"#type-input"}} -->
3. Check that **draft note** appears under the field.
<!-- step {"find":{"selector":"#echo","elementText":"draft note"}} -->
<!-- test end -->
