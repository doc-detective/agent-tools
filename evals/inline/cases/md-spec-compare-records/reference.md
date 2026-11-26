# Compare two records side by side

Open two records in their own tabs to compare them and keep a separate note on
each one. The record list stays open in the original tab.

## Open the record list

<!-- test {"testId":"compare-records-two-tabs"} -->
1. Go to `http://localhost:8092/multi-tab.html`.
   <!-- step {"goTo":"http://localhost:8092/multi-tab.html"} -->

   The list page shows the heading **MULTI-TAB HOME**.
   <!-- step {"find":"MULTI-TAB HOME"} -->

## Open the first record

2. Click **Open child via window.open**.
   <!-- step {"click":"Open child via window.open"} -->

   The first record opens in a new tab. Its label reads **PAGE opened**.
   <!-- step {"find":{"elementText":"PAGE opened","surface":{"browser":"chrome","tab":{"url":"page=opened"}}}} -->

3. In the first record's tab, enter `first draft` in the **Echo input:** field.
   <!-- step {"type":{"keys":"first draft","selector":"#echo-input","surface":{"browser":"chrome","tab":{"url":"page=opened"}}}} -->

   Your note appears next to the field.
   <!-- step {"find":{"selector":"#echo-out","elementText":"first draft","surface":{"browser":"chrome","tab":{"url":"page=opened"}}}} -->

## Open the second record

4. Switch back to the original tab and click **Open child in new tab**.
   <!-- step {"click":{"elementText":"Open child in new tab","surface":{"browser":"chrome","tab":0}}} -->

   The second record opens in another new tab. Its label reads **PAGE linked**.
   <!-- step {"find":{"elementText":"PAGE linked","surface":{"browser":"chrome","tab":{"url":"page=linked"}}}} -->

5. In the second record's tab, enter `second draft` in the **Echo input:** field.
   <!-- step {"type":{"keys":"second draft","selector":"#echo-input","surface":{"browser":"chrome","tab":{"url":"page=linked"}}}} -->

   Your note appears next to the field.
   <!-- step {"find":{"selector":"#echo-out","elementText":"second draft","surface":{"browser":"chrome","tab":{"url":"page=linked"}}}} -->

## Check your notes

6. Switch to the first record's tab.

   It still shows `first draft`. Notes stay with the record you wrote them in.
   <!-- step {"find":{"selector":"#echo-out","elementText":"first draft","surface":{"browser":"chrome","tab":{"url":"page=opened"}}}} -->
   <!-- test end -->
