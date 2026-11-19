| round | change (one line) | test | train | lenient | false triggers | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.879 | 0.898 | 0.896 | 0.000 | 14.6 | $13.03 | $13.03 |
| 1 | Route question-shaped and pasted-content requests to validate, generate, and the specialist agent | **0.949** | 0.987 | 0.979 | 0.000 | 13.9 | $13.14 | $26.17 |

Scores cover all 141 cases x 3 reps (the 102-case set plus 39 hard-set-2 cases added after round 1). Best: round 1, test 0.949, +7.1 points over baseline (paired 95% CI +-6.2).

At baseline the model answered Doc Detective requests itself whenever they came as a question or carried their input inline: a pasted spec or config, pasted doc text, "what would the test look like", general failure causes, and Playwright comparisons. Round 1 widened validate, generate, and the specialist agent to cover those shapes and to route them even when the model could answer from memory, while keeping each skill's "not for" boundaries. Test rose 7.1 points with no false triggers.

The climb stopped after round 1. Train is at 0.987 with one failing case (3 of 225 train runs), so no further change could show a gain above the noise floor. The hard-set-2 cases, added to give the analyzer more failures, turned out easy: baseline already routed 91 to 98 percent of them correctly.
