# Round 4: re-baseline (no skill change)

Round 1's skills, as #101 ships them with review fixes, run on the grown set (73 cases, 3 reps) under the corrected harness:

- `relativePathBase` left at its default, so spec paths resolve against the spec file.
- The session's `npx @hawkeyexl/manni` runs the pinned 2.6.0, not the registry's latest.
- 25 new cases; the split is now 33 train and 40 test.

Scores before this round aren't comparable with it. The paired noise floor on test, from rep-to-rep spread, is about +-0.055 at 3 reps.

Manni fell on the 19 shared cases (passes 0.649 to 0.439). To separate the skill review fixes from everything else, round 1's original skills ran on those cases under this harness (`ab-round1-skills-manni.jsonl`, $7.79): passes 0.509, verified coverage 0.374. The same skills lost 0.14 passes between runs, so most of the drop isn't from the skill changes. The review fixes' effect (passes -0.070 +-0.146, verified coverage -0.094 +-0.105) is within noise.
