# Fill in your profile

Your profile tells teammates who you are. Complete it the first time you use the
demo app.

## Enter your details

<!-- test {"testId":"profile-form"} -->
1. Go to `http://localhost:8092`.
   <!-- step {"goTo":"http://localhost:8092"} -->
2. In the **Text Inputs** section, fill in the fields:
   1. In the **Text Input:** field, enter your name: `Ada Lovelace`.
      <!-- step {"type":{"keys":"Ada Lovelace","selector":"#text-input"}} -->
   2. In the **Email Input:** field, enter your work email: `ada@example.com`.
      <!-- step {"type":{"keys":"ada@example.com","selector":"#email-input"}} -->
   3. In the **Textarea:** field, enter a short bio: `Analytical engine enthusiast.`
      <!-- step {"type":{"keys":"Analytical engine enthusiast.","selector":"#textarea"}} -->

   Each field shows what you entered.
   <!-- step {"runBrowserScript":{"script":"return [document.getElementById('text-input').value, document.getElementById('email-input').value, document.getElementById('textarea').value].join('|');","output":"Ada Lovelace|ada@example.com|Analytical engine enthusiast."}} -->

## Choose your interests

3. In the **Selection Elements** section, in the **Checkboxes:** group, select
   **Option 1** and **Option 3**.
   <!-- step {"click":"#checkbox1"} -->
   <!-- step {"click":"#checkbox3"} -->

   Both boxes are now checked. **Option 2** stays unchecked.
   <!-- step {"find":"#checkbox1:checked"} -->
   <!-- step {"find":"#checkbox3:checked"} -->
   <!-- step {"runBrowserScript":{"script":"return String(document.getElementById('checkbox2').checked);","output":"false"}} -->

4. In the **Dropdown Select:** list, choose **Option 2**.
   <!-- step {"click":"#select"} -->
   <!-- step {"click":"#select option[value='option2']"} -->

   The list now shows **Option 2** as the current choice.
   <!-- step {"find":"#select option[value='option2']:checked"} -->
   <!-- test end -->
