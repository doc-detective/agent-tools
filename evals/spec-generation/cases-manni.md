# Spec-generation cases: manni

Nineteen manni docs pages with their Doc Detective inline tests stripped out. Source: the manni repo at
commit `3a8b3d51399c4bac38021656b338af0f57376e88`, path `docs/src/content/docs/<manni path>`.

Each `cases-manni/<id>/` holds:

- `doc.mdx`: the page with every `{/* test ... */}`, `{/* step ... */}`, `{/* test end */}` marker removed, plus the "Doc Detective inline tests: ..." comment above them. Nothing else changes.
- `original.mdx`: the page as committed in manni. It never reaches the workspace.
- `workspace/`: the user repo the page assumes. It holds the files, folders, collections, and config the page names. Examples are `docs/limits.md` citing `lib/limits.ts`, a `manni.config.yaml` with the page's collection, and the schema at the page's path. They're built from the manni fixtures the page's inline tests used. Each is renamed and rewired so the page's commands print what the page says. Where the page has the reader change something (remove a field, edit a cited line), the workspace holds the starting state.
- `reference.spec.json`: the page's procedure as a v5 spec that passes from the workspace root, with the page's commands and paths. It makes the page's edits itself, with `node -e` steps, and commits with `git` where the page's output needs history.
- `expected.json`: one entry per command the page tells the reader to run or check. `match` is the command's shape. That's the subcommand and the flags the page's instruction requires, plus an output string only where the page itself quotes that output. Paths, exit codes, and `npx` are left out, so `manni ...` and `npx @hawkeyexl/manni ...` both match. `may_share` marks a check that can live in the same step as the one before. `doc_path` is where the page goes: `manni-docs/<id>.mdx`. `scaffolding` says what the workspace provides.

## Workspace and run

The runner copies `workspace/` to a fresh directory, puts the page at `doc_path`, adds `tests/.gitkeep`, and makes one git commit, so no history holds the original tests. A file stored as `_gitignore` becomes `.gitignore`. Doc Detective 5.6.0 runs the spec from that directory with [doc-detective.config.json](doc-detective.config.json), which sets `relativePathBase: "cwd"`, so a relative `workingDirectory` means the repo root.

The manni CLI comes from a build linked into `MANNI_PREFIX` (see [evals/README.md](../README.md)). The runner puts it first on `PATH` and sets `npm_config_prefix`, for the session and the grade alike, so `manni` and `npx @hawkeyexl/manni` run the same build. No `MANNI_ENCRYPTION_KEY` is set. A key lives in the workspace config: key-ci starts with one, and key-set-up has the reader write one.

A citation pin names a commit the one-commit workspace doesn't have, so a changed source reads `changed (history unavailable: ...)`. That is the degraded output the cite CI page documents, and it is still `source-changed`.

## Cases

| id | manni path | expected steps | workspace | summary |
|---|---|---|---|---|
| cite-get-started | cite/get-started/index.mdx | 17 | `docs/limits.md` (no citations yet), `lib/limits.ts`, config | The whole walkthrough: `add --dry-run`, add, check, then source change and accept, source move, claim move, `--accept --only`, `--marker`, `--quote`. The reference commits twice so the page's "1 commit" output holds. |
| cite-set-up | cite/set-up/index.mdx | 5 | `docs/limits.md`, `lib/limits.ts`, config with collection `docs-pages` | First `cite add` dry run and add, a bare check, the wrong-root `missing` result, and the no-config exit 2. |
| cite-require-citations | cite/set-up/require-citations.mdx | 6 | `docs/reference/` pages, `lib/limits.ts`, the house schema and the citations vocabulary under `schema/`, config | The unresolved `$ref` error, the 3-file validate result, `cite check` warning then failing after `severity:`, and the duplicate-id finding. |
| cite-sidecar | cite/set-up/citations-in-a-sidecar.mdx | 13 | `docs/` pages, `guides/guide.md`, `docs-citations.yaml`, `guides-citations.yaml`, `lib/`, config with `site` and `guides` | Manifest-held citations: `meta get`, the manifest column and line, `-f github`, the half-moved page, `add` and `update` dry runs, the join check, three refusals. |
| cite-fix | cite/fix/index.mdx | 3 | `docs/limits.md` pinned to `lib/limits.ts:2`, with two lines since added above it | "Reproduce and confirm locally": check, `cite update`, check again. |
| cite-ci | cite/ci/index.mdx | 7 | `docs/limits.md` with one current and one drifted citation, `lib/limits.ts`, config | The workflow's `-f github` command, `--write-baseline`, `--baseline`, then "Verify it works": source-changed, source-moved, claim-moved, and `cite update`. |
| key-set-up | key/set-up/index.mdx | 10 | Config with collection `site` and no key, `owners.yaml` with encrypted `owner` values, `schemas/encrypted.schema.json`, `docs/` pages, `docs/limits.md` citing `src/limits.ts` with an encrypted source | What each tool does with no key (validate warns, `cite check` reports `missing`, `--no-check-sources`, refused `meta query UPDATE` and `cite add --encrypt`), `key set --dry-run`, `key set`, and the `key rotate` command the page names. |
| key-ci | key/ci/index.mdx | 14 | Config with collection `site`, a schema that encrypts `owner`, and the key `manni key set` wrote; `docs/auth.md` with an encrypted `owner`; `docs/limits.md` with an encrypted source; `.manni-cite-baseline.json` | The rotation runbook, with green gates, `key rotate --dry-run`, `key rotate`, `--write-baseline`, green again, the narrowed rotation with `--to`, and the quoted refusals. The resume section isn't scored: the page never has the reader interrupt a rotation. |
| meta-get-started | meta/get-started/index.mdx | 3 | `path/to/your-doc.md` | Validate the passing file, remove `type`, read the failing result. |
| meta-set-up | meta/set-up/index.mdx | 4 | `docs/intro.md`, `docs/billing.md` (no `type`), no config | Validate the folder, add the config, the bare run, `--format github`, and the no-config exit 2. |
| meta-set-up-config | meta/set-up/config.mdx | 7 | The page's full `manni.config.yaml` with collection `authors`, `schemas/article.json`, `docs/`, `articles/`, `authors/`, `README.md` | `-c` to a missing file, a path argument, the `meta.paths` refusal, `--collection authors` and `pages`, the paths-and-collection refusal, a bare run. |
| meta-per-folder-schemas | meta/set-up/different-schemas-per-folder.mdx | 2 | `api/`, `guides/`, the page's three schemas, a baseline-only config | Add the overrides, then "Verify your overrides": a bare run and `--collection api`. |
| meta-new-required-field | meta/set-up/new-required-field.mdx | 7 | `docs/api/` pages without `owner`, `docs/guides/intro.md`, `schemas/doc.json`, config | Require `owner`, `--write-baseline`, the baselined run, a new page fails, "no longer occur", prune, and `meta query ALTER TABLE`. |
| meta-retrofit | meta/set-up/retrofit.mdx | 5 | Seven `docs/` pages with partial frontmatter, no config | `schemas infer`, `infer --out`, a bare validate, `--format github`, then `--write-baseline` after tightening the schema. |
| meta-external-metadata | meta/set-up/external-metadata.mdx | 8 | `test/fixtures/external-metadata/` and `external-metadata-join/`, the paths the page names | Line-located findings in the manifest, owned keys, `meta get`, the orphan run, join duplicates and orphans, the refused join-field query, the dry-run `UPDATE`. |
| meta-fix | meta/fix/index.mdx | 2 | `docs/guide.md` without `type`, no config | Reproduce the missing-`type` error, add `type: concept`, confirm `1 passed`. |
| meta-ci-exit-codes | meta/ci/exit-codes-and-annotations.mdx | 8 | `bad-timestamp.md`, `bad-timestamp.html`, `missing-type.md`, two `docs/` pages | Exit 2 on a bad flag, pretty output, `--format json`, `github` (with `col=` for HTML), `sarif`, `junit`, `--no-color`. |
| meta-ci-query-gates | meta/ci/query-gates.mdx | 11 | Five `docs/` pages, two `authors/` pages, `schemas/author.json`, config with `pages` and `authors` | The tag census, `--check` with a join, a self-join, `having`, `--param`, named `checks:`, a path-scoped run, json, csv, `--db`, the dry run. |
| meta-schemas | meta/schemas/index.mdx | 4 | Three Diataxis-typed `docs/` pages, `schemas/metadata.schema.json`, `path/to/document.md` | `meta schemas`, `validate -s` with a schema file, stacked Diataxis and OKF, then `$schema:` in the file. |

## Pages not used

- `meta/reference/query.mdx`: a 28-claim reference page with no procedure for a reader to follow.
- `meta/reference/cli.mdx`: needs a 2.1 GB local llama-cpp model, which CI prefetches and caches. A cold run exceeds Doc Detective's 60 s step limit.
- `meta/set-up/derived-metadata.mdx`: runs `meta get --derived` over manni's own git history.
- The other 15 pages with tests were left out to keep the area balance and favor task pages: `cite/index`, `cite/set-up/public-docs-private-code`, `meta/index`, `meta/ci/{index,consume-results,govern-shared-schema,recipes}`, `meta/fix/faq`, `meta/schemas/{encrypted-fields,field-location}`, `meta/set-up/machine-authorship`, and `meta/reference/{built-in-schemas,configuration,docusaurus-schemas,output-and-exit-codes}`.

## Known gaps between a page and the CLI

The references follow the CLI where it differs from the page, and no `match` depends on the difference:

- cite-sidecar: piping a page into `cite add` needs `--as markdown`, which the page leaves out.
- meta-fix: the page says a missing required field has no `(line N)`; the CLI prints `(line 1)`.
- meta-ci-exit-codes: the missing-type GitHub annotation carries `line=1`, which the page says it drops. The JSON example lists one schema where the CLI lists two.
- meta-per-folder-schemas: only `--format json` names the schemas applied to each file; the page says the per-file output does.
- meta-new-required-field: the CLI prints "1 no longer occurs" where the page shows "37 no longer occur".
