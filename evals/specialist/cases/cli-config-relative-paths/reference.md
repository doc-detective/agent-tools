A relative path in a config file resolves against that file's folder, because `relativePathBase` defaults to `file`. In `config/ci.json`, `docs` means `config/docs`, which doesn't exist, so nothing was tested and the run exits `2`.

That covers `output` too. Without a fix, `results.json` lands in `config/`, and so does the run folder from the default `outputDir` of `.`. Version 4 resolved a config's `output` against the current directory, so this part is new.

To resolve the config's paths against the folder you run from, set `relativePathBase` to `cwd`:

```json
{
  "input": "docs",
  "output": "results.json",
  "relativePathBase": "cwd"
}
```

Then run it from the repo root as before:

```bash
npx doc-detective -c config/ci.json
```

`relativePathBase: "cwd"` also applies to relative paths inside your specs, such as a screenshot `path` or a `runShell` `workingDirectory`. If you'd rather leave those relative to each spec file, keep the default and write the config's paths relative to the config instead: `"../docs"` and `"../results.json"`.

Paths passed as flags, such as `--input docs`, always resolve against the current directory.
