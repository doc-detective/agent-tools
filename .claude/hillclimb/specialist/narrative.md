| round | change (one line) | test complete | test correct | train complete | train correct | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.556 | 0.600 | 0.433 | 0.489 | 73 | $20.19 | $20.19 |
| 1 (not kept) | Read the plugin references by `${CLAUDE_PLUGIN_ROOT}` path, and state documented facts | 0.433 | 0.511 | 0.489 | 0.522 | 31 | $23.23 | $43.42 |

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

Round 1 targeted how the agent finds its references. Claude Code fills in `${CLAUDE_PLUGIN_ROOT}` in an agent's body, which a one-question probe confirmed, so the agent now names each reference by that absolute path. Where a tool leaves the variable as is, the agent looks for `doc-detective-generate/references/actions.md` in the tool's plugin or extension folder, and falls back to the docs site. It also points to the docs site's `llms.txt` index and its `.md` pages. Two new guidelines tell it to state a documented default, status, exit code, or stream instead of hedging, and to build each snippet from the reference's own examples.

The agent now reads its references: 0.94 reads a run, up from 0.06, and web fetches fell from 5.4 to 1.9. Sessions got faster, 31 seconds against 73. Snippets improved on both splits: train `snippets_valid` rose 0.844 to 0.944, beyond its CI, and held-out `snippets_run` 0.856 to 0.922. Train `rec-no-audio-annotate` and `shot-annotate-in-recording` went to 3 of 3, and `act-background-ready` to 3 of 3. But held-out `complete` fell 0.556 to 0.433 (-0.122 ±0.162), inside the noise, so round 1 isn't kept. Train `complete` rose 0.433 to 0.489 (+0.056 ±0.157). Sessions cost $19.08 and the judge $4.15.

The train failures show why. The references are written for generating specs, so they cover action syntax and little of how a run behaves. Reading them, the agent fetches the docs less often and is now sure of less. Every remaining train `correct` failure is a run-time fact no reference holds: exit codes and streams (`cli-false-retries-flag`, `res-v5-message-grep`, `cli-deprecated-pipeline`), config path resolution (`cli-config-relative-paths`, 0 of 3), the context roll-up and `--no-exit-on-fail` (`res-all-skipped-exit-2`, 2 of 3 to 0 of 3), config `retries`, `detectSteps` precedence, the hosted-run override, and screenshot comparison. The answers say "I couldn't confirm" for each of them. In `shot-overwrite-false-skipped` the agent quotes the docs site, which says `"false"` compares, while 5.6.3 skips the step. One snippet failure is unrelated to the references: every `cli-false-retries-flag` snippet opens `https://example.com`, since the question names no URL, so the grader's run of it can't find the button.
