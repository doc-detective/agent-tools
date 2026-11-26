# Fill in the sample form

This walkthrough uses two demo pages. The first has common form fields, and the
second echoes what you type.

## Fill in the form

<!-- test {"testId":"fill-form"} -->
1. Go to the [form page](http://localhost:8092/index.html). The page title reads
   **Common HTML Elements**.
<!-- step {"goTo":"http://localhost:8092/index.html"} -->
<!-- step {"find":"Common HTML Elements"} -->
2. In the **Text Input** field, enter "Ada Lovelace".
<!-- step {"type":{"keys":"Ada Lovelace","selector":"#text-input"}} -->
3. Under **Selection Elements**, select the **Option 2** checkbox.
<!-- step {"click":{"selector":"#checkbox2"}} -->

   > **Note:** Leave the other checkboxes and the radio buttons as they are.

4. Click **Standard Button**.
<!-- step {"click":"Standard Button"} -->
<!-- test end -->

## Check the echo

<!-- test {"testId":"check-echo"} -->
1. Open the [echo page](http://localhost:8092/type-echo.html).
<!-- step {"goTo":"http://localhost:8092/type-echo.html"} -->
2. In the **Type here** field, type "draft note". The page copies the text under
   the field as you type, so check that **draft note** shows there too.
<!-- step {"type":{"keys":"draft note","selector":"#type-input"}} -->
<!-- step {"find":{"selector":"#echo","elementText":"draft note"}} -->
<!-- test end -->
