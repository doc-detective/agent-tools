# Round 9: copy `stdio` from the command's real output

Builds on round 7, with round 8's guidance and one rule changed. Round 8 was reverted.

Diagnosed from round 8's failing train runs only. Of 9 failing train runs, 5 manni runs failed on a `stdio` pattern the command didn't print: a whole `+citations:` diff, `must have required property 'type' [google:okf:0.1]`, the no-key message with its path, and an unknown-schema message. The sessions did run commands in scratch folders, but on setups that differed from what their spec builds, and they asserted whole lines copied from the page or from those experiments. Round 8's rule said to set `stdio` to "output the page shows ... once you've seen the command print it", which still pointed at the page's text. The other failures were a 60-second timeout, a spec that didn't load, and two `runCode` runs where Doc Detective doubled an absolute path into its output folder, which the skill can't fix.

Change: round 8's "Test what the page shows" section, with the `stdio` rule rewritten. Set `stdio` to a short, distinctive part of what the command printed when run in a scratch folder on the files the spec's earlier steps create. Don't copy output from the page, and leave out paths, line numbers, and punctuation that could differ. "Reproduce the problem" now asserts what the command prints, not the line the page shows.
