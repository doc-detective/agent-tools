The `<!-- test end -->` line breaks the page. MDX doesn't support HTML comments, so the page isn't valid MDX.

When an `.mdx` file isn't valid MDX, Doc Detective warns and parses the file as Markdown instead. Markdown parsing doesn't detect content inside JSX components, so `Click **Standard Button**.` inside `<Steps>` never becomes a `click` step. The test still passes, because its only step left is the `goTo`.

In an `.mdx` file, write every statement as a JSX comment, `test end` included:

```mdx
{/* test {"testId": "standard-button"} */}

{/* step {"goTo": "http://localhost:8092/"} */}

<Steps>
  <Step>Click **Standard Button**.</Step>
</Steps>

{/* test end */}
```

With the page valid MDX again, Doc Detective detects the bold text inside `<Step>` as a `click` step and a `find` step, and the warning goes away. The Markdown link form, `[comment]: # (test end)`, also works in MDX. The same HTML comment breaks your site's MDX build, too.
