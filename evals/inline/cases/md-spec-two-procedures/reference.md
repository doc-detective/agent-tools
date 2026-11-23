# Use your account

## Sign in

<!-- test {"testId":"login-flow","description":"Verify login procedure from documentation"} -->
1. Open the [sign-in page](https://app.example.com/login). The page shows a **Sign In** form.
   <!-- step {"goTo":"https://app.example.com/login"} -->
   <!-- step {"find":"Sign In"} -->
2. In the email field, enter "user@example.com".
   <!-- step {"type":{"selector":"#email","keys":"user@example.com"}} -->
3. In the password field, enter "secret123".
   <!-- step {"type":{"selector":"#password","keys":"secret123"}} -->
4. Click **Sign In**.
   <!-- step {"click":"Sign In"} -->

   Your **Dashboard** opens.
   <!-- step {"find":"Dashboard"} -->

![Dashboard after sign-in](login-success.png)
<!-- step {"screenshot":"login-success.png"} -->
<!-- test end -->

## Find the documentation

<!-- test {"testId":"navigation-test","description":"Test main navigation links"} -->
1. Go to the [app home page](https://app.example.com).
   <!-- step {"goTo":"https://app.example.com"} -->
2. The footer links to the [documentation](https://docs.example.com).
   <!-- step {"checkLink":"https://docs.example.com"} -->
3. Click **Documentation** in the top menu.
   <!-- step {"click":"Documentation"} -->

   The documentation home lists the **API Reference**.
   <!-- step {"find":"API Reference"} -->
   <!-- test end -->
