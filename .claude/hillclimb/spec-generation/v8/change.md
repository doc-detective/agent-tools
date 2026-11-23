# Round 8: test what the page shows, on top of round 7

Builds on round 7. The maintainer raised the round limit to 10.

Round 6 added a "Test what the page shows" section to generate and was reverted: coverage rose (train +0.094 +-0.048), but passes fell (train -0.121 +-0.102), and held-out verified coverage didn't move. Later, 26 of round 6's 49 failing runs turned out to have written their spec through a Bash heredoc holding `\\`, the Windows backslash collapse that round 7's guardrail fixed. Part of round 6's drop in passes was that bug, not the guidance.

Change: reapply round 6's skill text unchanged on top of round 7. Generate's SKILL.md gets the "Test what the page shows" section (the page's commands as written, `stdio` on the page's output, reproduce the problem shown, run an example spec's steps), and the command-path rule becomes its own bullet with a `../` counterexample. No new diagnosis; this round measures whether round 6's coverage gain holds once the heredoc failures are gone.
