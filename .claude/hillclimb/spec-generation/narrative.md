| round | change (one line) | test vcov | test complete | train vcov | passes | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.695 | 0.609 | 0.731 | 0.768 | 55 | $13.61 | $13.61 |
| 1 | Use the Doc Detective CLI (`validate`, `--dry-run`) before the hosted MCP tools | 0.717 | 0.623 | 0.697 | 0.783 | 40 | $15.31 | $28.92 |
| 2 (reverted) | Test command-line pages the way a reader walks them | 0.702 | 0.667 | 0.778 | 0.739 | 67 | $17.56 | $46.48 |
| 3 (reverted) | Round 2 scoped to CLI pages, starting from the workspace | 0.752 | 0.681 | 0.877 | 0.770 | 52 | $25.69 | $97.38 |

Round 1 is the change the maintainer asked for. The hosted MCP tools aren't loaded in the eval or in many users' setups, so generate and validate now use the CLI's `validate` subcommand and `--dry-run` first. Quality didn't move beyond noise (test verified coverage +0.023, paired 95% CI +-0.082; train -0.041 +-0.066), and sessions got 27 percent faster because they no longer reach for tools that aren't there. Manni CLI docs remain the main gap (verified coverage 0.40).

Round 2 taught generate to test command-line pages in page order, scripting every file edit, commit, and shown failure. Manni coverage jumped (0.703 to 0.922) and web rose, but dd-docs fell from 0.875 to 0.625 and the held-out test score didn't move (-0.015, CI +-0.153) while train rose 0.081, the overfitting signature. It was reverted; round 3 refines it from round 2's train transcripts.

Round 3 scoped round 2's guidance to pages where the reader runs a CLI on their own files, and kept Doc Detective action pages as written. Train rose sharply (+0.180, CI +-0.107; manni 0.404 to 0.636 across all cases, with web and dd-docs up too), but with test cases rerun to 6 reps the held-out gain over round 1 was +0.013 (CI +-0.108). It was reverted. Test scores for rounds 1 and 3 use 6 reps per test case; spend includes those extra reps.

The climb stops here: three rounds in a row left the held-out score within noise, which meets the plateau rule. The noise floor on 23 test cases (about +-0.10) is larger than the gains a single skill change has produced on held-out cases, so the eval needs more test cases before another round could show a win. Round 1 is the result: the CLI-first change the maintainer asked for, neutral on quality and 27 percent faster.
