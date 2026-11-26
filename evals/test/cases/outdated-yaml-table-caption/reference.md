Results: 0 passed, 1 failed
  ✗ sample-data-table: Couldn't find element `Sample Data Table`.

The doc is out of date, not the spec. Step 3 of docs/sample-data.md says the table is captioned **Sample Data Table**, and the spec looks for the same text, but the caption on the page reads **Simple Data Table**. The spec's last step (`Jane Smith`) was skipped only because the step before it failed. I didn't change the spec: making it pass would hide the problem in the doc.

Proposed doc edit, step 3:

    3. Find the table captioned **Simple Data Table**.

with the spec's step changed to match: `- find: Simple Data Table`. Should I apply both?
