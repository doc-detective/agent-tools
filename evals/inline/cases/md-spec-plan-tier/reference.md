# Choose a plan tier

Your plan tier sets how many projects your team can run at once. You can switch
tiers at any time.

<!-- test {"testId":"plan-tier"} -->
1. Go to `http://localhost:8092/multiple-matches.html`.
   <!-- step {"goTo":"http://localhost:8092/multiple-matches.html"} -->

2. The tier buttons are labeled **First**, **Second**, and **Third**. Click
   **Third**.
   <!-- step {"click":{"selector":"button.multi","elementText":"Third"}} -->

   The page confirms your choice with **Third clicked**.
   <!-- step {"find":"Third clicked"} -->

3. Changed your mind? Click **Second**.
   <!-- step {"click":{"selector":"button.multi","elementText":"Second"}} -->

   The page adds **Second clicked** under the first confirmation.
   <!-- step {"find":"Second clicked"} -->
   <!-- step {"runBrowserScript":{"script":"return Array.from(document.querySelectorAll('#messages p')).map(p => p.textContent).join('|');","output":"Third clicked|Second clicked"}} -->
   <!-- test end -->

> **Note:** Screen readers announce every tier button as "Multi button", so
> assistive-technology users pick a tier by its position in the list.
