# Load live content

The live content page fetches its data from the demo API each time you open it, so
you always see the latest version.

## Open the live content page

<!-- test {"testId":"loading-content"} -->
1. Go to `http://localhost:8092/waitUntil-test-network.html`.
   <!-- step {"goTo":{"url":"http://localhost:8092/waitUntil-test-network.html","waitUntil":{"networkIdleTime":500}}} -->

   The page heading reads **Network Activity Test**. While the request is in
   flight, the content area briefly shows **Loading...**.
   <!-- step {"find":"Network Activity Test"} -->

2. Wait for the request to finish.

   The content area updates to **Content loaded from API**. This usually takes less
   than a second on a local installation.
   <!-- step {"find":{"selector":"#content","elementText":"Content loaded from API","timeout":5000}} -->
   <!-- test end -->

> **Note:** On slow connections, the loading message can stay on screen for several
> seconds. You don't need to reload the page.
