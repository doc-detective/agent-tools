# Open a record in a new tab

When you compare records, open each one in its own browser tab so the list stays
where you left it.

## Open the record

<!-- test {"testId":"open-record-new-tab"} -->
1. Go to `http://localhost:8092/multi-tab.html`.
   <!-- step {"goTo":"http://localhost:8092/multi-tab.html"} -->

   The list page shows the heading **MULTI-TAB HOME**.
   <!-- step {"find":"MULTI-TAB HOME"} -->

2. Click **Open child in new tab**.
   <!-- step {"click":"Open child in new tab"} -->

   The record opens in a new browser tab. The new tab shows **CHILD PAGE MARKER**
   and the record label **PAGE linked**.
   <!-- step {"find":{"elementText":"CHILD PAGE MARKER","surface":{"browser":"chrome","tab":{"url":"page=linked"}}}} -->
   <!-- step {"find":{"elementText":"PAGE linked","surface":{"browser":"chrome","tab":{"url":"page=linked"}}}} -->

## Add a note to the record

3. In the new tab, click the **Echo input:** field and enter `draft note`.
   <!-- step {"type":{"keys":"draft note","selector":"#echo-input","surface":{"browser":"chrome","tab":{"url":"page=linked"}}}} -->

   Your note appears next to the field as you type.
   <!-- step {"find":{"selector":"#echo-out","elementText":"draft note","surface":{"browser":"chrome","tab":{"url":"page=linked"}}}} -->

## Return to the list

4. Switch back to the original tab.

   The list page is unchanged and still shows **MULTI-TAB HOME**.
   <!-- step {"find":{"elementText":"MULTI-TAB HOME","surface":{"browser":"chrome","tab":0}}} -->
   <!-- test end -->
