Doc Detective 5 dropped the `<data name="step">{...}</data>` form, so it ignores those elements. `<data>` statements still work, in a different shape: the element is always named `doc-detective`, and the whole statement, keyword included, goes in its `value` attribute.

```xml
<task id="api-reference">
  <title>Open the API reference</title>
  <taskbody>
    <context><data name="doc-detective" value="test testId='api-reference'"/></context>
    <steps>
      <step><cmd>Open the API reference.</cmd>
        <info><data name="doc-detective" value="step checkLink='https://docs.example.com/api'"/></info>
      </step>
    </steps>
    <postreq><data name="doc-detective" value="test end"/></postreq>
  </taskbody>
</task>
```

`value` takes the same statements as a processing instruction: `test ...`, `step ...`, and `test end`. Inside it, write the step's fields as attributes, as above, or as JSON in a single-quoted attribute: `<data name="doc-detective" value='step {"checkLink": "https://docs.example.com/api"}'/>`. Either quote style works for `name` and `value`.

These are standard DITA `<data>` elements, so the topics validate with DITA-aware tools and survive a pipeline that strips processing instructions.
