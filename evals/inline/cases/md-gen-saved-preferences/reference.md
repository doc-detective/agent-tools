# View your saved preferences

The demo app remembers your display preferences in a browser cookie. The
preferences page lists every preference stored for your browser.

## Before you begin

<!-- test {"testId":"saved-preferences"} -->
Set a theme preference so there's something to view. In your browser, open
`http://localhost:8092/cookies/set/theme/dark`. The page confirms with
**Cookie set.**
<!-- step {"goTo":"http://localhost:8092/cookies/set/theme/dark"} -->
<!-- step {"find":"Cookie set."} -->

You only need to do this once per browser. If you clear your cookies, set the
preference again.

## View the preferences page

1. Go to `http://localhost:8092/cookies`.
   <!-- step {"goTo":"http://localhost:8092/cookies"} -->

2. Find your theme preference in the list.

   You should see **theme=dark**.
   <!-- step {"find":"theme=dark"} -->
   <!-- test end -->

If the page is blank, your browser didn't store the preference. Repeat the
**Before you begin** step in the same browser window.
