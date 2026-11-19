| round | change (one line) | test | train | lenient | false triggers | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.844 | 0.893 | 0.879 | 0.000 | 14.1 | $9.51 | $9.51 |
| 1 | Route question-shaped and pasted-content requests to validate, generate, and the specialist agent | **0.932** | 0.981 | 0.971 | 0.000 | 13.4 | $9.71 | $19.22 |

Best so far: round 1 (test 0.932, +8.8 points over baseline, paired 95% CI ±8.3).

At baseline the model answered Doc Detective requests itself whenever they came as a question or carried their input inline: a pasted spec or config, pasted doc text, "what would the test look like", general failure causes, and Playwright comparisons. The descriptions were written around files, and the agent's "not for Playwright" line pushed tool comparisons away. Round 1 widened validate, generate, and the specialist agent to cover those shapes and to route them even when the model could answer from memory, while keeping each skill's "not for" boundaries. Test rose 8.8 points with no false triggers on the 26 requests that shouldn't route.
