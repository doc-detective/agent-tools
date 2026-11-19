# Spec-generation cases: manni

Twenty manni docs pages with their Doc Detective inline tests stripped out. Source: the manni repo at
commit `3a8b3d51399c4bac38021656b338af0f57376e88`, path `docs/src/content/docs/<manni path>`.

Each `cases-manni/<id>/` holds:

- `doc.mdx`: the page with every `{/* test ... */}`, `{/* step ... */}`, `{/* test end */}` marker removed, plus the "Doc Detective inline tests: ..." comment above them. Nothing else changes.
- `original.mdx`: the page as committed in manni.
- `reference.spec.json`: the inline tests as a standalone v5 spec. Every reference passes against a manni build, using the setup below.
- `expected.json`: one entry per step the page's prose requires. `match` is compared case-insensitively against the step JSON with backslashes stripped, so regex escapes in `stdio` still match. Several entries share a `match`, such as `1 passed`, so assign generated steps to expected steps one-to-one. `scaffolding` lists what the runner supplies and the grader doesn't score.

All steps are `runShell` calls against the `manni` CLI. They run from the manni repo root, over committed fixtures under `test/fixtures/`. The pages show example paths, not those fixtures. A generated spec can only pass if the runner tells the generator about the fixtures, or maps the page's paths onto them.

## Setup and run

The setup mirrors manni's `.github/workflows/docs-as-tests.yml`. In Git Bash:

```bash
git clone <manni> manni && cd manni && git checkout 3a8b3d51399c4bac38021656b338af0f57376e88
npm ci && npm run build
export npm_config_prefix="$PWD/../npm-global"   # CI links globally; this keeps the link local
npm link && npm link @hawkeyexl/manni           # `manni` on the prefix, and node_modules/@hawkeyexl/manni for npx
export PATH="$npm_config_prefix:$PATH"          # Windows layout; on Linux/macOS use $npm_config_prefix/bin
rm -f .dd-baseline.json                         # BEFORE every run: meta-new-required-field fails if a stale one exists
npx -y doc-detective@5.5.0 -c .doc-detective.json -i <abs path>/generated.spec.json --output-dir <out>
```

Each reference spec takes 7 to 39 s on Windows, roughly 1 to 1.5 s per step plus about 3 s of startup. Doc Detective 5.5.0 is what CI's `doc-detective/github-action@v1` installs (`version: latest`). It warns `EBADENGINE` on Node 24.11, which is harmless.

- Run from the manni repo root. `runShell` uses the process cwd.
- Use a full clone, not a shallow one.
- No manni encryption key may be configured. The `key-*` cases assert that refusal.
- No network access and no secrets are needed.

## Cases

| id | manni path | area | steps (ref / expected) | summary |
|---|---|---|---|---|
| cite-get-started | cite/get-started/index.mdx | cite | 12 / 11 | Pin a claim, then check each status: current, moved, changed, markers, quotes. |
| cite-set-up | cite/set-up/index.mdx | cite | 6 / 6 | First `cite add` dry run, first check, root and collection behavior. |
| cite-require-citations | cite/set-up/require-citations.mdx | cite | 8 / 8 | Compose a house schema with the citations vocabulary, and set severity. |
| cite-sidecar | cite/set-up/citations-in-a-sidecar.mdx | cite | 12 / 12 | Citations kept in a manifest, with the merged view, add or update, and three refusals. |
| cite-fix | cite/fix/index.mdx | cite | 12 / 12 | One check per finding rule id, then confirm the fix locally. |
| cite-ci | cite/ci/index.mdx | cite | 5 / 5 | Exit codes and `-f github` error, warning, and notice annotations. |
| key-set-up | key/set-up/index.mdx | key | 8 / 8 | `key set` dry run, refusals, and behavior of validate and cite with no key. |
| key-ci | key/ci/index.mdx | key | 4 / 4 | `key rotate` refusals: short `--to`, stdin, format, no key. |
| meta-get-started | meta/get-started/index.mdx | meta | 5 / 3 | Validate a passing file and a failing file, and read the result. |
| meta-set-up | meta/set-up/index.mdx | meta | 3 / 3 | Validate a folder, the no-input error, and the CI shape with `--format github`. |
| meta-set-up-config | meta/set-up/config.mdx | meta | 7 / 7 | Config discovery, `-c`, and collections with `--collection`. |
| meta-per-folder-schemas | meta/set-up/different-schemas-per-folder.mdx | meta | 4 / 4 | Schema sets, `--schema` precedence, overlapping collections. |
| meta-new-required-field | meta/set-up/new-required-field.mdx | meta | 4 / 4 | Roll out a required field with `--write-baseline` and `--baseline`. |
| meta-retrofit | meta/set-up/retrofit.mdx | meta | 3 / 3 | `schemas infer` coverage probe, then a permissive schema compared with OKF. |
| meta-external-metadata | meta/set-up/external-metadata.mdx | meta | 7 / 7 | Manifest-held metadata: line-located findings, owned keys, joins. |
| meta-fix | meta/fix/index.mdx | meta | 5 / 5 | Common validate failures and the confirm-locally step. |
| meta-ci-exit-codes | meta/ci/exit-codes-and-annotations.mdx | meta (ci) | 10 / 9 | Exit codes 0, 1, and 2, and which commands accept `--format github`. |
| meta-ci-query-gates | meta/ci/query-gates.mdx | meta (ci) | 13 / 13 | SQL gates with `meta query --check`, named checks, scoped runs, CSV. |
| meta-schemas | meta/schemas/index.mdx | meta | 10 / 10 | `$schema` refs, a minimal schema, and stacked taxonomy schemas. |
| meta-query-reference | meta/reference/query.mdx | meta (reference) | 28 / 28 | Query table model, writes, DDL bridge, refusals, CSV. |

The suite has 8 cite cases, 2 key cases, and 10 meta cases. At this commit, `a11y` and `term` have no inline tests.

## Pages not used

- `meta/reference/cli.mdx`: needs a 2.1 GB local llama-cpp model, which CI prefetches and caches. A cold run exceeds Doc Detective's 60 s step limit.
- `meta/set-up/derived-metadata.mdx`: runs `meta get --derived` over manni's own git history, and fails in a shallow or archived checkout.
- The other 15 pages with tests were left out to keep the area balance and favor task pages: `cite/index`, `cite/set-up/public-docs-private-code`, `meta/index`, `meta/ci/{index,consume-results,govern-shared-schema,recipes}`, `meta/fix/faq`, `meta/schemas/{encrypted-fields,field-location}`, `meta/set-up/machine-authorship`, and `meta/reference/{built-in-schemas,configuration,docusaurus-schemas,output-and-exit-codes}`. All of them pass in a baseline run.
