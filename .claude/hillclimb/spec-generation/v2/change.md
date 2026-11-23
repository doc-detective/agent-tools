# Round 2 change: script the page's edit-then-run sequence for CLI docs

Teach doc-detective-generate to test a command-line page as a reader walks it: in page order, with every file edit, commit, and shown failure scripted as a `runShell` step, instead of skipping sections that change files or writing them in ways that break.

## Behavior, count, cost

The generate skill gives no guidance for command-line procedures. On manni pages the model treats the workspace as read-only. It drops every section where the reader edits, moves, or commits a file, or sees an error. When it does script an edit, it reaches for `runCode`, `runShell.args`, a scratch copy, or an invented `workingDirectory`, and those steps fail. It also writes later sections without regard to the state earlier steps left, and leaves `exitCodes` at the default `[0]` for runs the page shows failing.

- **Omits edit-dependent or error sections (spec passes, coverage lost):** 11 of 21 passing manni case-reps. cite-get-started r0, r1; key-set-up r0, r1; meta-fix r1; cite-require-citations r0, r1, r2; cite-sidecar r0, r1, r2. About 5.5 verified-coverage points (sum of 1 - vc attributable to the omitted steps).
- **Scripts the edit or state wrongly (spec fails, vc = 0):** 6 manni case-reps. meta-set-up r1 (`args`), r2 (`runCode`); meta-fix r2 (`runCode`); meta-schemas r2 (`runCode`); key-set-up r2 (key written before the no-key section); cite-get-started r2 (invented `workingDirectory`). About 4.7 points (the coverage those specs would have scored had they passed).
- **Default exit code on a failing run:** meta-set-up-config r0, r1 (spec fails). About 1.75 points.

Total: 17 of 30 manni case-reps, about 12 of the ~16 points manni lost on train (roughly 40 points of manni verified_coverage). No web or dd-docs case-rep shows it.

## Evidence

The model says outright that it skips edits. Final assistant messages, all under `.claude/hillclimb/spec-generation/v1/traces/`:

- `manni-cite-get-started_rep0.json`: "I left out the later sections of the page: source changes, source moves, page changes, markers and `--quote`. Each one needs someone to edit `lib/limits.ts` or the page between steps, and the page doesn't show those edits as commands."
- `manni-cite-get-started_rep1.json`: "Those depend on editing `lib/limits.ts` and committing between steps, so the tests would be fragile."
- `manni-cite-require-citations_rep2.json`: "I left out the doc's `manni.config.yaml` snippets, the `$ref` compile-failure transcript and the `claim-changed: error` run. Each needs a different repository setup than the other examples."
- `manni-meta-fix_rep1.json`: "**Apply the fix and re-run to see the green check:** it would edit `docs/guide.md`, so the test would change a repo file."
- `manni-key-set-up_rep0.json`: "**Real `manni key set`:** It would write a key into `manni.config.yaml` in your workspace."
- `manni-cite-sidecar_rep1.json`: "Steps 1 and 2 only edit config and YAML files, so they have no test. I also didn't cover the refusal cases or the findings output."
- `manni-meta-set-up-config_rep2.json`: "I also left out ... the `--collection` plus positional paths error".

The case expectations say the opposite. expected.json scaffolding, meta-fix: "The reader adds `type: concept`, so a spec edits the file between the two runs." cite-get-started: "the page has the reader (or someone) change the source, commit it, move it, and edit the page, so a spec makes those edits and the source commit itself". cite-require-citations: "a spec adds the page's `severity:` block before the blocking run."

Edits that were scripted broke the run:

- `manni-meta-set-up_rep1.json` (steps: 3 pass, 1 fail, 2 skipped, so the 4th step failed): `"command": "node", "args": ["-e", "require('fs').writeFileSync('manni.config.yaml', ...)"]`.
- `manni-meta-set-up_rep2.json` (2 pass, 1 fail, 2 skipped, so the 3rd step failed): `"runCode": { "language": "javascript", "code": "require('fs').writeFileSync('manni.config.yaml', [...].join('\\n'));" }`. Rep0 of the same case wrote the same file with one `node -e "..."` command and scored 1.0.
- `manni-meta-fix_rep2.json` and `manni-meta-schemas_rep2.json`: file writes through `runCode`; by the step counts each spec failed at that step.
- `manni-cite-get-started_rep2.json`: `"workingDirectory": "example-repo"` on every `cite` step, a folder that doesn't exist (2 pass, 1 fail, 2 skipped).
- `manni-key-set-up_rep2.json`: runs `manni key set` (writes the key) in its first test, then a `no-key-behavior` test expecting "no encryption key is available". State left by the earlier step.
- `manni-meta-set-up-config_rep0.json` and `_rep1.json`: `manni meta validate` steps with no `exitCodes`. Rep2 of the case set `"exitCodes": [0, 1]` on the same commands and passed.

Contrast: `manni-meta-fix_rep0.json` did script the edits as `runShell` (`sed -i`, `printf`), covered every expected step (coverage 1.0), and failed on one step. The intent is right. The skill needs to make it the default and name the robust form.

## Change

Add a `### Test commands and file edits` subsection to `src/skills/doc-detective-generate/SKILL.md`, after the action mapping. It sets the rule for command-line pages:

- Follow page order.
- Script every create, edit, move, delete, or commit as a `runShell` step on the file the page names.
- Write files with a quoted heredoc, `printf >>`, or `sed -i` inside `command`, not `args` or `runCode`.
- Omit `workingDirectory`.
- Order or undo changes when a later section needs the earlier state.
- Test the failures the page shows, with the stated nonzero exit code.
- Assert a short substring of the line the page quotes.
- Don't make the edits yourself while generating.

## Expected flips

- cite-get-started (3 reps, 0.18/0.18/0): the later sections become steps. A partial chain that passes moves each rep up by 0.3 or more.
- meta-set-up r1, r2; meta-fix r2; meta-schemas r2: the file write becomes a heredoc or `sed -i` step and stops failing (0 to 0.75-1.0 each).
- meta-fix r1 (0.5), cite-require-citations (0.5-0.75), key-set-up r0/r1 (0.11/0.22), cite-sidecar (0.57-0.71): the edit-dependent and refusal steps get written.
- meta-set-up-config r0, r1 (0): exit codes set from the transcript. r2 (0.75) gains the refusal step.
- meta-get-started (0.67 x3) and cite-require-citations r2 may gain from the quoted-line assertion rule.

## Possible regressions

- Longer command chains mean more chances for one step to fail, which costs `passes`. A single wrong heredoc or `sed` pattern now zeros a case that used to pass at partial coverage.
- `sed -i` with an anchor that doesn't match is a silent no-op, so the next assertion fails.
- Web slice: the section only applies when the page has the reader run commands, so browser procedures shouldn't change. dd-docs pages with shell examples (runcode, load-variables) may gain file-writing steps.
- Pages with no stated exit code: the rule says nonzero when the transcript shows failures. A tool that reports failures but exits `0` would now fail that step.

## Diff

```diff
diff --git a/src/skills/doc-detective-generate/SKILL.md b/src/skills/doc-detective-generate/SKILL.md
index cceaf9d..538e1c2 100644
--- a/src/skills/doc-detective-generate/SKILL.md
+++ b/src/skills/doc-detective-generate/SKILL.md
@@ -81,6 +81,23 @@ Match elements by their visible text, as a reader does: write `{ "click": "Submi
 
 Full action catalog, with every field: [references/actions.md](references/actions.md). Other skills and the specialist agent use it too.
 
+### Test commands and file edits
+
+When the page has the reader run commands, test it the way a reader walks it: top to bottom, in one working copy.
+
+- **Follow the page's order.** Each step runs against the files that earlier steps left. Make one test per procedure, and keep the tests in page order.
+- **Script every change the page asks for.** When the page has the reader create, edit, move, or delete a file, or commit, add a `runShell` step that makes that change. Put it right before the command that depends on it. Change the file the page names, not a copy, so later commands run as the page writes them. Don't skip a section because it changes files or needs a commit.
+- **Write files with bash.** `runShell` runs `bash` on every platform. Write a whole file with a quoted heredoc, append with `printf '...' >> <file>`, and change one line with `sed -i`. Keep the whole edit in `command`. Don't split it into `args`, and don't use `runCode` for it. To commit, pass an identity: `git -c user.name=docs -c user.email=docs@example.com commit -am "<message>"`.
+- **Run where Doc Detective runs.** Omit `workingDirectory` unless the page changes directory, and use the paths the page uses.
+- **Watch state between sections.** When a section describes the state before an earlier change, such as behavior with no setting, test it before that change, or undo the change first.
+- **Test the failures the page shows.** A refusal, an error, or a run that reports failures is a step too. Set `exitCodes` to the code the page states. A transcript that shows failures or a refusal means a nonzero exit, so don't leave the default `[0]`.
+- **Assert what the page quotes.** Set `stdio` to a short substring of the line the page points at, such as the summary line or the error message, copied from its transcript.
+- **Don't make the changes yourself.** Write them into the spec. The spec starts from the files as they are now.
+
+```json
+{ "runShell": { "command": "cat > app.config.yaml <<'EOF'\nname: demo\nmode: strict\nEOF" } }
+```
+
 ### Validate
 
 Validate with Doc Detective's own CLI. It checks the spec without running it:
```
