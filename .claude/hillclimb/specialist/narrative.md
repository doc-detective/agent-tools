| round | change (one line) | test complete | test correct | train complete | train correct | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.556 | 0.600 | 0.433 | 0.489 | 73 | $20.19 | $20.19 |

The baseline runs the `doc-detective-specialist` agent as it stands at 3.4.1, on 60 cases at 3 reps, with `claude-sonnet-5-5`. Each session runs as the agent itself (`--agent doc-detective:doc-detective-specialist`) in an empty folder. All 180 sessions finished. One first try hit the 1800-second ceiling and passed on the rerun. Sessions took 73 seconds on average and cost $16.33. The judge cost about $3.86. Writing and checking the cases cost about $3.05 more: $2.48 for `check-references.mjs` runs, and $0.55 for a two-session pilot. All in, about $23.25.

| metric | train | test |
|---|---|---|
| `complete` | 0.433 | 0.556 |
| `snippets_valid` | 0.844 | 0.856 |
| `snippets_run` | 0.856 | 0.856 |
| `correct` | 0.489 | 0.600 |
| `no_invention` | 0.989 | 0.989 |

The standard error on `complete` is about 0.05 on each side. The held-out side scores higher, so its cases are easier on average, even though each area is split about evenly.

The agent rarely invents. It almost never claims a feature, key, or flag that doesn't exist, and it rejects false premises well. Where it fails is `correct`: the answers leave out the edge case the question turns on, or they hedge on it.

What the train failures show:

- **The agent doesn't read its references.** It makes 0.06 reference reads a run and 5.4 web fetches. The agent names its references by repo-relative path (`skills/doc-detective-generate/references/actions.md`). From a user's folder, those paths don't resolve, so it falls back to fetching docs.doc-detective.com.
- **It hedges where it should state.** When the docs site doesn't settle a point, the answer says it couldn't confirm it, or that it won't guess, and leaves the fact out. That fails `correct` in `act-retries-vs-retry`, `cli-config-relative-paths`, `shot-size-mismatch`, and both hosted-run cases.
- **Some facts aren't on the docs site at all.** The hosted-run capture override (ADR 01196) and the screenshot size-mismatch rules (ADR 01205) score 0 of 3 on train: `rec-hosted-autorecord`, `shot-hosted-autoscreenshot`, and `shot-size-mismatch`. Only the agent's own references could carry these facts.
- **Skip paths come from memory, and they're wrong.** `shot-overwrite-false-skipped` expects a comparison where 5.6.3 skips the step. `rec-stale-no-baselines` misses that a skipped span never seeds baselines. Each scores 0 or 1 of 3.
- **Answers drop the detail that makes the edge case.** `act-timeout-zero` gets the rules right but leaves out that the run exits 2 in two of three runs. `cli-deprecated-pipeline` and `res-v5-message-grep` explain a workaround without saying logs moved to stderr.
- **Snippets break on newer fields.** `onFail` is written as an object instead of a list (`cli-false-retries-flag`, `act-retries-vs-retry`). `timeout` appears on a background `runShell` (`act-background-ready`), and an `annotate` step has the wrong shape (`shot-annotate-in-recording`). Some JSON blocks don't parse. `in-asciidoc-indented-statement` gives no snippet in 2 of 3 runs.
- **It reaches outside Doc Detective.** `rec-no-audio-annotate` (0 of 3) gets "no audio" right but sends the user to ffmpeg post-production instead of `annotate` steps inside the recording.

Some failures were the grader's, not the agent's. Two were fixed, and their rows were regraded from the recorded answers:

- The flag check failed `no_invention` in all three `cli-false-retries-flag` runs. Each answer quoted the user's own `doc-detective --retries 3` to say the flag doesn't exist. The check now skips flags the question names, and endorsing such a flag is left to the judge's `must_not`. The recorded judge verdicts stand. `complete` didn't change, since the case fails other metrics.
- `act-timeout-zero`'s first fact said "no value means 'no limit'", meaning that no value turns the limit off. The judge read it as "leaving it out removes the limit", and so it failed answers that rightly gave the 30000 ms default. The fact now says "No value turns the limit off". On regrade, one of its three runs passes, which moves train `complete` from 0.422 to 0.433.

Two others remain as judge noise. `cli-test-filter`'s third fact names an exact command, and in one run the judge read its "or" alternative as required. In one `in-asciidoc-testignore` run, the judge read the right `[source,bash,testIgnore]` advice as the forbidden `role=testIgnore` claim.

The first round should start with how the agent finds its references, then make it state documented edge cases instead of hedging. Held-out runs weren't used to diagnose anything.
