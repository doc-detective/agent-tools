# Round 3: scope the CLI edit rules to command-line walkthroughs, and stop writing what the page only illustrates

Keep round 2's `Test commands and file edits` subsection, but scope it to pages where the reader runs a CLI on their files. Carve out Doc Detective test examples, and add three rules: don't recreate files the workspace has, treat config snippets as partial, and test only what the page shows a result for.

## Diagnosis (train only)

Train rows: `.tmp/s3/v1-train-rows.jsonl` and `.tmp/s3/v2-train-rows.jsonl`. Traces live under `.claude/hillclimb/spec-generation/{v1,v2}/traces/`. Where a step had to be identified, I re-ran the spec from the trace like the grader does: the case workspace plus the page, a one-commit git repo, `doc-detective@5.6.0 -c evals/spec-generation/doc-detective.config.json`, and the linked manni 4.28.0. Scripts are in `.tmp/s3/r3/` (`extract.js`, `run.js`).

### dd-docs: verified_coverage 9/12 to 5/12 on train

Five reps dropped (automatic-recording r1, find-by-image r1 and r2, load-variables r0 and r2) and one rose (find-by-image r0). Two causes:

**A. The round-2 text made the model script files the page only shows or assumes. 3 reps, all caused by "Script every change the page asks for" and "Write files with bash".**

- `dd-docs-automatic-recording_rep1.json` (vc 1 to 0, coverage 0). It wrote the page's example spec to a file instead of using its two `goTo` steps: `"command": "cat > login.spec.json <<'EOF'\n{\n  \"tests\": [ ... { \"goTo\": \"http://localhost:8092\" } ...`. Then it ran `npx doc-detective@5 --no-auto-record --dry-run --input login.spec.json`, which the case lists under `must_not`. `_rep0.json` did the same: "writes the page's `login.spec.json` with a heredoc, then runs it with `npx doc-detective@5 --input login.spec.json`". So 2 of 3 v2 reps wrapped the example. v1 `_rep1.json` used the steps directly: "follows the doc's example spec with two `goTo` steps".
- `dd-docs-load-variables_rep1.json` and `_rep2.json` (steps 2 pass, 1 fail). The page says to assume `secrets.env` exists. The workspace has one that points at the local server. The model overwrote it with the page's placeholders. Rep2: "The page says the file already exists, so the test creates it first." Rep1: "`DATA_URL` points to the placeholder `https://api.example.com/data` ... I kept the URL as the page writes it." The `httpRequest` then fails. No v1 rep created the file.

**B. Path rewriting, not caused by round 2. 3 v2 reps; 2 v1 reps had it too.**

- `dd-docs-find-by-image_rep1.json` and `_rep2.json` wrote `"elementImage": "../icons/save.svg"` where the page has `icons/save.svg`. `dd-docs-load-variables_rep0.json` wrote `"loadVariables": "../secrets.env"`. In v1, find-by-image rep0 and load-variables rep1 failed the same way.
- The model is right for Doc Detective's defaults. `relativePathBase` defaults to `"file"` in the 5.6.0 schema. But `evals/spec-generation/doc-detective.config.json` sets `"relativePathBase": "cwd"`, and the session can't see that config. This is a harness mismatch, not a skill gap. I left it out of this change; see "Harness notes".

### manni: train passes 21/30 (v1) to 24/30 (v2); 6 v2 reps fail

| Rep | Grader steps | Failing step and cause | Rule behind it |
|---|---|---|---|
| meta-per-folder-schemas r0 | 5 pass, 1 fail, 1 skip | Each section's snippet overwrote `manni.config.yaml` as a whole file. The last one is a bare `meta.overrides` fragment with no `collections:`. Then `validate-all` failed, and `--collection api` was skipped. Locally: `manni.config.yaml: meta.overrides[0].collection names "api", which collections: does not define.` (exit 2) | Write a whole file with a heredoc, and script every change |
| meta-per-folder-schemas r2 | 10 pass, 1 fail | `group-several-globs` wrote the page's example of another layout (`paths: [.claude, docs]`) and then validated it. Locally: `Files not found: ".claude", "docs".` (exit 2) | Same |
| meta-set-up-config r2 | 16 pass, 1 fail | Reproduced exactly. `validate-no-config`, `npx @hawkeyexl/manni meta validate --no-config`, exited 2 with `No files to validate.` The page only mentions the flag in prose: "To run against the built-in defaults instead, pass `--no-config`." No command and no result. The model invented the call and left `exitCodes` at `[0]`. | Test every section in page order, with no "only what the page shows" limit |
| meta-fix r2 | 14 pass, 1 fail, 1 skip | For three error types the page only describes, it built fake documents with `printf -- '---\ntype: concept\ntitle: My Guide\ntimestamp: last Tuesday\n---\n' > docs/guide.md`. The page's own reproduce, fix, and re-run steps pass in every environment. The invented tests pass with manni 2.6.0 (16/16) and fail with 4.28.0 (12 pass, 4 fail). The grader got a third result, so the exact step depends on the manni version. | Script every change, with no guard against invented content |
| cite-get-started r1 | 19 pass, 4 fail, 13 skip | Doesn't reproduce: the final spec passes 36/36 locally. Its edits and commits are scripted correctly. | None found |
| cite-get-started r2 | 33 pass, 2 fail, 5 skip | Couldn't rebuild the spec (made by a generated `gen.js`). The model copied `stdio` from a scratch run, so the drift is likely between environments. | None found |

No failure traced to heredocs on Git Bash, to commit order, or to the git identity. Those rules held. `meta-fix_rep0`, `meta-set-up_rep1/2`, and `meta-set-up-config_rep0/1` flipped to pass because of them.

### What round 2 got right (kept as is)

The 18 manni reps whose verified_coverage rose did so through page order, scripted edits and commits, heredoc writes, nonzero `exitCodes`, and quoted `stdio`. cite-require-citations went from 0.58 to 1.00 avg, cite-sidecar from 0.62 to 1.00, key-set-up from 0.11 to 0.78, and meta-set-up-config from 0.25 to 0.67. This change keeps every one of those bullets.

## The change

Changes from round 2's subsection:

1. **Scope sentence.** It applies when the reader runs a command-line tool against their own files, not whenever a page shows a command.
2. **Doc Detective carve-out.** A page that documents an action or shows a test has the spec steps already. Copy them. Don't write them to a file and run Doc Detective on it.
3. **Start from the workspace.** A file the page says exists is a prerequisite. Don't recreate it or swap in sample values.
4. **Treat config snippets as partial.** Write one only when a later command runs against it. Append a new top-level key. Otherwise write the full file, with the existing content plus the snippet's keys. Skip snippets for paths the workspace lacks.
5. **Test what the page shows a result for.** That means a command in a code block, or a quoted message or output. A flag mentioned only in prose gets no step. Don't fabricate content to stage an error the page only describes. The quoted-message clause keeps meta-set-up-config's expected `--collection` refusal, which the page states only in prose with a quoted message.
6. Two round-2 sentences were shortened to under 25 words, with the same meaning.

## Expected flips (train)

- dd-docs automatic-recording r0, r1: coverage 0 to 1. The steps become the example's `goTo` steps.
- dd-docs load-variables r2: 0 to 1. r1 also stops overwriting the file, but may still hit the `../` path issue.
- manni meta-per-folder-schemas r0, r2: 0 to 1. The verify runs see a complete config, and the other-layout snippet is skipped.
- manni meta-set-up-config r2: 0 to 1. No `--no-config` step.
- manni meta-fix r2: likely 0 to 1. Fewer invented error fixtures.
- Unchanged: find-by-image (path base), cite-get-started r1 and r2 (not reproducible), web (out of scope by the first sentence).

Net on train: up to +3 dd-docs reps (to about 8/12 vc) and +3 or +4 manni passes, with no manni coverage given back.

## Risks

- **Over-trimming.** "Test what the page shows a result for" may drop a prose-only step that an expected list wants. The quoted-message clause covers the train cases I checked (meta-set-up-config, cite-sidecar's `--no-config` is in a code block). A held-out page that states a behavior with no quote and no command could lose a step.
- **Merged config writes.** Rewriting the whole file means retyping the workspace's content. A typo there zeros a case that used to pass. Appending a new top-level key avoids that in the common case, such as cite-require-citations' `severity:` block.
- **Carve-out wording.** A dd-docs page whose point is a Doc Detective CLI run, such as a CLI reference, may now skip a `runShell` the page expects. Only "write the example to a file and run Doc Detective on it" is forbidden, not every Doc Detective command.
- **Skipping snippets for missing paths** could hide a page section the expected list wants, where the workspace was meant to have the paths. In train, every such snippet was illustrative.

## Harness notes (not part of this change)

- `relativePathBase: "cwd"` in the eval config conflicts with Doc Detective's default (`"file"`). That cost 3 of the 5 dd-docs train drops in v2 and 2 reps in v1. Either remove it, or move the generated spec to the workspace root. Teaching the skill to the eval's setting would be wrong for real users.
- manni resolution varies. One spec (meta-fix r2) gives 16/16 with manni 2.6.0, 12/4 with 4.28.0, and 14/1/1 in the grader. The session saw 4.28.0 through `npx`. Check that the session and the grader resolve the same `@hawkeyexl/manni`.

## Diff

Against the current `src/skills/doc-detective-generate/SKILL.md` (round-1 text). `git apply --check` passes.

```diff
diff --git a/src/skills/doc-detective-generate/SKILL.md b/src/skills/doc-detective-generate/SKILL.md
index cceaf9d..4996ff6 100644
--- a/src/skills/doc-detective-generate/SKILL.md
+++ b/src/skills/doc-detective-generate/SKILL.md
@@ -81,6 +81,28 @@ Match elements by their visible text, as a reader does: write `{ "click": "Submi
 
 Full action catalog, with every field: [references/actions.md](references/actions.md). Other skills and the specialist agent use it too.
 
+### Test commands and file edits
+
+Use this section when the page has the reader run a command-line tool against their own files. Test the page the way a reader walks it: top to bottom, in one working copy.
+
+A page that documents a Doc Detective action, or shows a Doc Detective test, is different. Its example steps are your steps, so copy them into the spec. Don't write the example to a file and run Doc Detective on it from a `runShell` step.
+
+- **Follow the page's order.** Each step runs against the files that earlier steps left. Make one test per procedure, and keep the tests in page order.
+- **Script the changes the page makes.** When the page has the reader create, edit, move, or delete a file, or commit, add a `runShell` step that makes that change. Put it right before the command that depends on it. Change the file the page names, not a copy. Don't skip a section because it changes files or needs a commit.
+- **Start from the workspace.** A file the page says already exists is a prerequisite, not a step. Use the workspace's copy as it is. Don't recreate it, and don't replace its values with the page's sample values.
+- **Treat config snippets as partial.** A snippet often shows only the keys one section adds, or a layout from another repository. Write one only when a later command on the page runs against it. Append it when its top-level key is new. Otherwise write the whole file: the workspace's content plus the snippet's keys. Skip a snippet that names paths the workspace doesn't have.
+- **Test what the page shows a result for.** That means a command in a code block, or a message or output the page quotes. A flag the page only mentions in prose, with no stated result, needs no step. Don't make up file content to stage an error the page only describes.
+- **Write files with bash.** `runShell` runs `bash` on every platform. Write a whole file with a quoted heredoc, append with `printf '...' >> <file>`, and change one line with `sed -i`. Keep the whole edit in `command`. Don't split it into `args`, and don't use `runCode` for it. To commit, pass an identity: `git -c user.name=docs -c user.email=docs@example.com commit -am "<message>"`.
+- **Run where Doc Detective runs.** Omit `workingDirectory` unless the page changes directory, and use the paths the page uses.
+- **Watch state between sections.** When a section describes the state before an earlier change, test it before that change. Or undo the change first.
+- **Test the failures the page shows.** A refusal, an error, or a run that reports failures is a step too. Set `exitCodes` to the code the page states. A transcript that shows failures or a refusal means a nonzero exit, so don't leave the default `[0]`.
+- **Assert what the page quotes.** Set `stdio` to a short substring of the line the page quotes, such as the summary or the error message.
+- **Don't make the changes yourself.** Write them into the spec. The spec starts from the files as they are now.
+
+```json
+{ "runShell": { "command": "cat > app.config.yaml <<'EOF'\nname: demo\nmode: strict\nEOF" } }
+```
+
 ### Validate
 
 Validate with Doc Detective's own CLI. It checks the spec without running it:
```
