| round | change (one line) | test vcov | test complete | train vcov | passes | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.695 | 0.609 | 0.731 | 0.768 | 55 | $13.61 | $13.61 |
| 1 | Use the Doc Detective CLI (`validate`, `--dry-run`) before the hosted MCP tools | 0.717 | 0.623 | 0.697 | 0.783 | 40 | $15.31 | $28.92 |
| 2 (reverted) | Test command-line pages the way a reader walks them | 0.702 | 0.667 | 0.778 | 0.739 | 67 | $17.56 | $46.48 |

Round 1 is the change the maintainer asked for. The hosted MCP tools aren't loaded in the eval or in many users' setups, so generate and validate now use the CLI's `validate` subcommand and `--dry-run` first. Quality didn't move beyond noise (test verified coverage +0.023, paired 95% CI +-0.082; train -0.041 +-0.066), and sessions got 27 percent faster because they no longer reach for tools that aren't there. Manni CLI docs remain the main gap (verified coverage 0.40).

Round 2 taught generate to test command-line pages in page order, scripting every file edit, commit, and shown failure. Manni coverage jumped (0.703 to 0.922) and web rose, but dd-docs fell from 0.875 to 0.625 and the held-out test score didn't move (-0.015, CI +-0.153) while train rose 0.081, the overfitting signature. It was reverted; round 3 refines it from round 2's train transcripts.
