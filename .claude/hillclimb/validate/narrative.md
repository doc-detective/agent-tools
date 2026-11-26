| round | change (one line) | test complete | test verdict | train complete | train no_false_pass | s/case | $/run | spend |
|---|---|---|---|---|---|---|---|---|
| 0 | baseline | 0.980 | 0.980 | 1.000 | 1.000 | 14 | $5.88 | $11.76 |

The baseline runs `/doc-detective-validate` as the skill stands at 3.4.1, on 34 cases at 3 reps. All 102 sessions finished, at 14 seconds each. Sessions cost $5.80 and the judge about $0.08. Spend counts two full runs, because the first was set aside (below).

| metric | train (51 runs) | test (51 runs) |
|---|---|---|
| `complete` | 1.000 | 0.980 |
| `verdict` | 1.000 | 0.980 |
| `fields` | 1.000 | 1.000 |
| `no_false_pass` | 1.000 | 1.000 |
| `no_harm` | 1.000 | 1.000 |

Every train run passed every metric. Each session ran a validator about once (1.03 calls on average). Every call was `npx doc-detective@5 validate`, and the reports copy its error lines. No session changed a file it wasn't asked to fix, and none said an invalid input passes. One held-out run fails `verdict`. It isn't diagnosed here, since the held-out runs mustn't steer a round.

The first full run scored train `complete` 0.843, but every train failure in it was the grader's, not the skill's:

- In `fix-requested`, all three reports said the spec failed, then ended `Validation PASSED` for the fixed file. The grader read that closing marker as the verdict on the original. It now asks the judge for the verdict on the file as given.
- One `not-a-spec-package-json` report said "there is no `Validation PASSED`". The grader read that as a pass. It now skips a negated marker.
- In `config-deprecated-debug`, the judge counted a deprecation warning on `beforeAny` as an invalid field. Its question now says a warning isn't one.
- In `not-a-spec-package-json`, reports that explained the missing `tests` array counted as inventing a field. When the validator rejects a whole file, it names no field, so the grade now checks only the verdict there.

The same four rules applied to held-out rows with the same shapes. `check-references.mjs` passed before and after the change, and the baseline was rerun with the fixed grader. That rerun is row 0.

With train at 1.000, there's no train failure to diagnose. A climb needs harder train cases first, written without seeing the held-out runs. Candidates are several files in one call, a config whose `input` holds an invalid spec, a CLI that can't run (the fallback path), and a pasted YAML spec.
